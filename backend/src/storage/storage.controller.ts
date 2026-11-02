import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  UseGuards
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserRole } from "@prisma/client";
import { Public, Roles } from "../auth/auth.decorators";
import { AuthenticatedRequest } from "../auth/auth.types";
import { CsrfGuard } from "../auth/csrf.guard";
import { PresignUploadDto } from "./dto/presign-upload.dto";
import { StorageService } from "./storage.service";

const STORAGE_ROLES = [UserRole.KONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN] as const;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

type UploadedMemoryFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Controller("storage")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post("uploads/presign")
  @Roles(...STORAGE_ROLES)
  @UseGuards(CsrfGuard)
  @Header("Cache-Control", "no-store")
  presignUpload(@Body() input: PresignUploadDto, @Req() request: AuthenticatedRequest) {
    return this.storage.createUpload(request.authUser!, input);
  }

  @Post("uploads/:uploadId/local")
  @Roles(...STORAGE_ROLES)
  @UseGuards(CsrfGuard)
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
        callback(new BadRequestException("Format berkas tidak diizinkan."), false);
        return;
      }
      callback(null, true);
    }
  }))
  @Header("Cache-Control", "no-store")
  uploadLocalFile(
    @Param("uploadId") uploadId: string,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    if (!file) throw new BadRequestException("Pilih berkas yang akan diunggah.");
    return this.storage.storeLocalUpload(request.authUser!, uploadId, file);
  }

  @Get("uploads/:uploadId/download-url")
  @Roles(...STORAGE_ROLES)
  @Header("Cache-Control", "no-store")
  createDownloadUrl(@Param("uploadId") uploadId: string, @Req() request: AuthenticatedRequest) {
    return this.storage.createDownloadUrl(request.authUser!, uploadId);
  }

  @Get("uploads/:uploadId/file")
  @Roles(...STORAGE_ROLES)
  @Header("Cache-Control", "private, no-store")
  async downloadPrivateFile(
    @Param("uploadId") uploadId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const file = await this.storage.getPrivateLocalFile(request.authUser!, uploadId);
    return new StreamableFile(file.data, {
      type: file.contentType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
    });
  }

  @Get("uploads/:uploadId/public-file")
  @Public()
  @Header("Cache-Control", "private, no-store")
  async downloadApprovedFile(@Param("uploadId") uploadId: string) {
    const file = await this.storage.getApprovedLocalFile(uploadId);
    return new StreamableFile(file.data, {
      type: file.contentType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
    });
  }
}
