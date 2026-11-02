import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ModerationStatus,
  StorageUpload,
  StorageUploadKind,
  StorageProvider,
  StorageUploadStatus,
  UserRole
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { PublicUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { PresignUploadDto } from "./dto/presign-upload.dto";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  PRESIGNED_URL_TTL_SECONDS
} from "./storage.constants";

const MODERATION_ROLES: ReadonlySet<UserRole> = new Set([UserRole.MODERATOR, UserRole.ADMIN]);

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly localUploadsDirectory = resolve(process.cwd(), "uploads");

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {
    const region = this.config.get<string>("AWS_REGION") ?? "ap-southeast-3";
    if (region !== "ap-southeast-3") {
      throw new Error("AWS_REGION untuk penyimpanan harus ap-southeast-3.");
    }
    this.s3 = new S3Client({
      region
    });
  }

  async createUpload(user: PublicUser, input: PresignUploadDto) {
    const extension = extname(input.originalName).toLocaleLowerCase("en-US");
    const allowedTypes = ALLOWED_CONTENT_TYPES[input.kind];
    const extensionAndTypeMatch = Object.entries(allowedTypes).some(
      ([allowedExtension, contentType]) =>
        extension === allowedExtension && input.contentType === contentType
    );
    if (!extensionAndTypeMatch) {
      throw new ConflictException("Format nama berkas dan tipe berkas tidak sesuai.");
    }
    if (input.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new ConflictException("Ukuran berkas melebihi batas 15 MB.");
    }

    await this.prisma.storageUpload.deleteMany({
      where: {
        ownerId: user.id,
        status: StorageUploadStatus.RESERVED,
        expiresAt: { lt: new Date() }
      }
    });

    const objectKey = `uploads/${user.id}/${randomUUID()}${extension}`;
    const expiresAt = new Date(Date.now() + PRESIGNED_URL_TTL_SECONDS * 1000);
    const storageProvider = await this.useLocalStorage()
      ? StorageProvider.LOCAL
      : StorageProvider.S3;
    const post = storageProvider === StorageProvider.S3
      ? await createPresignedPost(this.s3, {
        Bucket: this.bucketName(),
        Key: objectKey,
        Expires: PRESIGNED_URL_TTL_SECONDS,
        Fields: { "Content-Type": input.contentType },
        Conditions: [
          ["content-length-range", 1, MAX_UPLOAD_BYTES],
          ["eq", "$Content-Type", input.contentType]
        ]
      })
      : null;

    const upload = await this.prisma.storageUpload.create({
      data: {
        ownerId: user.id,
        objectKey,
        storageProvider,
        originalName: input.originalName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        kind: input.kind,
        expiresAt
      },
      select: { id: true }
    });

    return {
      uploadId: upload.id,
      uploadUrl: post?.url ?? "",
      fields: post?.fields ?? {},
      storageMode: storageProvider,
      expiresIn: PRESIGNED_URL_TTL_SECONDS
    };
  }

  async storeLocalUpload(
    user: PublicUser,
    uploadId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ) {
    const upload = await this.prisma.storageUpload.findUnique({ where: { id: uploadId } });
    if (!upload || upload.ownerId !== user.id) {
      throw new NotFoundException("Reservasi unggahan tidak ditemukan.");
    }
    if (upload.storageProvider !== StorageProvider.LOCAL) {
      throw new ConflictException("Reservasi ini tidak menggunakan penyimpanan lokal.");
    }
    if (upload.status === StorageUploadStatus.UPLOADED) {
      await this.verifyLocalObject(upload);
      return { uploadId: upload.id, uploaded: true };
    }
    if (upload.status !== StorageUploadStatus.RESERVED) {
      throw new ConflictException("Reservasi unggahan ini sudah tidak aktif.");
    }
    if (upload.expiresAt <= new Date()) {
      throw new GoneException("Masa berlaku unggahan telah berakhir.");
    }
    const extension = extname(upload.originalName).toLocaleLowerCase("en-US");
    const allowedTypes = ALLOWED_CONTENT_TYPES[upload.kind] as Record<string, string>;
    if (
      file.originalname !== upload.originalName
      || file.size !== upload.sizeBytes
      || file.size < 1
      || file.size > MAX_UPLOAD_BYTES
      || file.mimetype !== upload.contentType
      || allowedTypes[extension] !== upload.contentType
    ) {
      throw new ConflictException("Berkas tidak sesuai dengan data reservasi unggahan.");
    }

    const path = this.localFilePath(upload.objectKey);
    await mkdir(dirname(path), { recursive: true });
    try {
      await writeFile(path, file.buffer, { flag: "wx" });
    } catch (error) {
      if (this.hasErrorCode(error, "EEXIST")) {
        throw new ConflictException("Berkas untuk reservasi ini sudah tersimpan.");
      }
      throw error;
    }

    const result = await this.prisma.storageUpload.updateMany({
      where: { id: upload.id, status: StorageUploadStatus.RESERVED },
      data: { status: StorageUploadStatus.UPLOADED }
    });
    if (result.count !== 1) {
      await unlink(path);
      throw new ConflictException("Reservasi unggahan telah berubah. Silakan buat unggahan baru.");
    }
    return { uploadId: upload.id, uploaded: true };
  }

  async createDownloadUrl(user: PublicUser, uploadId: string) {
    const upload = await this.prisma.storageUpload.findUnique({
      where: { id: uploadId },
      include: { paper: { select: { status: true } } }
    });
    if (!upload || upload.status === StorageUploadStatus.REJECTED) {
      throw new NotFoundException("Berkas tidak ditemukan.");
    }

    const isModerator = MODERATION_ROLES.has(user.role);
    const isOwner = upload.ownerId === user.id;
    const isPublished = upload.paper?.status === ModerationStatus.APPROVED;
    if (!isOwner && !isModerator && !isPublished) {
      throw new ForbiddenException("Kamu tidak memiliki akses ke berkas ini.");
    }

    if (upload.storageProvider === StorageProvider.LOCAL) {
      await this.verifyLocalObject(upload);
      return {
        downloadUrl: `/api/storage/uploads/${upload.id}/file`,
        expiresIn: null
      };
    }
    const bucket = await this.verifyS3Object(upload);
    if (upload.status === StorageUploadStatus.RESERVED) {
      await this.prisma.storageUpload.updateMany({
        where: { id: upload.id, status: StorageUploadStatus.RESERVED },
        data: { status: StorageUploadStatus.UPLOADED }
      });
    }

    return this.signDownloadUrl(upload, bucket);
  }

  async createApprovedDownloadUrl(uploadId: string) {
    const upload = await this.prisma.storageUpload.findUnique({
      where: { id: uploadId },
      include: { paper: { select: { status: true } } }
    });
    if (
      !upload
      || upload.status !== StorageUploadStatus.ATTACHED
      || upload.paper?.status !== ModerationStatus.APPROVED
    ) {
      throw new NotFoundException("Arsip yang disetujui tidak ditemukan.");
    }
    if (upload.storageProvider === StorageProvider.LOCAL) {
      await this.verifyLocalObject(upload);
      return {
        downloadUrl: `/api/storage/uploads/${upload.id}/public-file`,
        expiresIn: null
      };
    }
    const bucket = await this.verifyS3Object(upload);
    return this.signDownloadUrl(upload, bucket);
  }

  async getPrivateLocalFile(user: PublicUser, uploadId: string) {
    const upload = await this.prisma.storageUpload.findUnique({
      where: { id: uploadId },
      include: { paper: { select: { status: true } } }
    });
    if (!upload || upload.status === StorageUploadStatus.REJECTED) {
      throw new NotFoundException("Berkas tidak ditemukan.");
    }
    const isModerator = MODERATION_ROLES.has(user.role);
    const isOwner = upload.ownerId === user.id;
    const isPublished = upload.paper?.status === ModerationStatus.APPROVED;
    if (!isOwner && !isModerator && !isPublished) {
      throw new ForbiddenException("Kamu tidak memiliki akses ke berkas ini.");
    }
    if (upload.storageProvider !== StorageProvider.LOCAL) {
      throw new NotFoundException("Berkas lokal tidak ditemukan.");
    }
    await this.verifyLocalObject(upload);
    return {
      data: await readFile(this.localFilePath(upload.objectKey)),
      originalName: upload.originalName,
      contentType: upload.contentType
    };
  }

  async getApprovedLocalFile(uploadId: string) {
    const upload = await this.prisma.storageUpload.findUnique({
      where: { id: uploadId },
      include: { paper: { select: { status: true } } }
    });
    if (
      !upload
      || upload.storageProvider !== StorageProvider.LOCAL
      || upload.status !== StorageUploadStatus.ATTACHED
      || upload.paper?.status !== ModerationStatus.APPROVED
    ) {
      throw new NotFoundException("Arsip yang disetujui tidak ditemukan.");
    }
    await this.verifyLocalObject(upload);
    return {
      data: await readFile(this.localFilePath(upload.objectKey)),
      originalName: upload.originalName,
      contentType: upload.contentType
    };
  }

  async verifyAttachedUploadForModeration(paperId: string, uploadId: string): Promise<void> {
    const upload = await this.prisma.storageUpload.findUnique({ where: { id: uploadId } });
    if (
      !upload
      || upload.paperId !== paperId
      || upload.status !== StorageUploadStatus.ATTACHED
    ) {
      throw new NotFoundException("Lampiran antrean moderasi tidak ditemukan.");
    }
    if (upload.storageProvider === StorageProvider.S3 && upload.expiresAt > new Date()) {
      throw new ConflictException("Tautan unggah masih aktif. Verifikasi kembali setelah tautan kedaluwarsa.");
    }
    await this.verifyStoredObject(upload);
  }

  async verifyUploadForSubmission(
    ownerId: string,
    uploadId: string,
    expectedKind: StorageUploadKind
  ) {
    const upload = await this.prisma.storageUpload.findUnique({ where: { id: uploadId } });
    if (!upload || upload.ownerId !== ownerId) {
      throw new NotFoundException("Reservasi unggahan tidak ditemukan.");
    }
    if (upload.kind !== expectedKind) {
      throw new ConflictException("Jenis berkas tidak sesuai dengan kolom unggahan.");
    }
    if (
      upload.status === StorageUploadStatus.REJECTED
      || upload.status === StorageUploadStatus.ATTACHED
    ) {
      throw new ConflictException("Berkas ini sudah digunakan atau ditolak.");
    }

    if (
      upload.storageProvider === StorageProvider.LOCAL
      && upload.status === StorageUploadStatus.RESERVED
      && upload.expiresAt <= new Date()
    ) {
      throw new GoneException("Masa berlaku unggahan telah berakhir.");
    }
    await this.verifyStoredObject(upload);
    if (upload.status === StorageUploadStatus.RESERVED) {
      await this.prisma.storageUpload.updateMany({
        where: { id: upload.id, status: StorageUploadStatus.RESERVED },
        data: { status: StorageUploadStatus.UPLOADED }
      });
    }
    return {
      id: upload.id,
      objectKey: upload.objectKey,
      originalName: upload.originalName,
      kind: upload.kind
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.s3.destroy();
  }

  private async headObject(bucket: string, key: string) {
    try {
      return await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === "NotFound") {
        throw new NotFoundException("Berkas belum tersedia di penyimpanan.");
      }
      this.logger.error("Pemeriksaan berkas S3 gagal.");
      throw error;
    }
  }

  private async verifyStoredObject(upload: StorageUpload): Promise<void> {
    if (upload.storageProvider === StorageProvider.LOCAL) {
      await this.verifyLocalObject(upload);
      return;
    }
    await this.verifyS3Object(upload);
  }

  private async verifyLocalObject(upload: StorageUpload): Promise<void> {
    const path = this.localFilePath(upload.objectKey);
    try {
      const file = await stat(path);
      if (!file.isFile() || file.size !== upload.sizeBytes) {
        throw new ConflictException("Berkas di penyimpanan tidak sesuai dengan data unggahan.");
      }
    } catch (error) {
      if (this.hasErrorCode(error, "ENOENT")) {
        throw new NotFoundException("Berkas belum tersedia di penyimpanan.");
      }
      throw error;
    }
  }

  private localFilePath(objectKey: string): string {
    const path = resolve(process.cwd(), objectKey);
    const relativePath = relative(this.localUploadsDirectory, path);
    if (
      !relativePath
      || relativePath === ".."
      || relativePath.startsWith(`..${sep}`)
      || isAbsolute(relativePath)
    ) {
      throw new ConflictException("Lokasi berkas tidak valid.");
    }
    return path;
  }

  private hasErrorCode(error: unknown, code: string): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === code;
  }

  private async useLocalStorage(): Promise<boolean> {
    if (process.env.NODE_ENV !== "development") return false;
    if (!this.config.get<string>("AWS_S3_BUCKET")) return true;
    try {
      await this.s3.config.credentials();
      return false;
    } catch (error) {
      this.logger.warn("Kredensial S3 tidak tersedia; menggunakan penyimpanan lokal untuk development.");
      this.logger.debug(error instanceof Error ? error.message : "Penyedia kredensial S3 gagal.");
      return true;
    }
  }

  private async verifyS3Object(upload: StorageUpload): Promise<string> {
    const bucket = this.bucketName();
    const object = await this.headObject(bucket, upload.objectKey);
    if (object.ContentLength !== upload.sizeBytes || object.ContentType !== upload.contentType) {
      throw new ConflictException("Berkas di penyimpanan tidak sesuai dengan data unggahan.");
    }
    if (
      upload.status === StorageUploadStatus.RESERVED
      && upload.expiresAt <= new Date()
      && (!object.LastModified || object.LastModified > upload.expiresAt)
    ) {
      throw new GoneException("Masa berlaku unggahan telah berakhir.");
    }
    return bucket;
  }

  private async signDownloadUrl(upload: StorageUpload, bucket: string) {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: upload.objectKey,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(upload.originalName)}`
      }),
      { expiresIn: PRESIGNED_URL_TTL_SECONDS }
    );
    return { downloadUrl: url, expiresIn: PRESIGNED_URL_TTL_SECONDS };
  }

  private bucketName(): string {
    const bucket = this.config.get<string>("AWS_S3_BUCKET");
    if (!bucket) {
      throw new ServiceUnavailableException("Penyimpanan berkas belum dikonfigurasi.");
    }
    return bucket;
  }
}
