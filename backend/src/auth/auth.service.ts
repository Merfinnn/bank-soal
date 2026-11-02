import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  OnModuleInit
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { argon2id, hash, verify } from "argon2";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { ModerationStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RECOVERY_DURATION_MS, SESSION_DURATION_MS } from "./auth.constants";
import type { PublicUser } from "./auth.types";
import type { LoginDto } from "./dto/login.dto";
import type { RecoveryCompleteDto } from "./dto/recovery-complete.dto";
import type { RecoveryRequestDto } from "./dto/recovery-request.dto";
import type { RegisterDto } from "./dto/register.dto";

type IssuedSession = {
  sessionToken: string;
  csrfToken: string;
};

const SESSION_SELECT = {
  id: true,
  userId: true,
  csrfTokenHash: true,
  expiresAt: true
} as const;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private dummyPasswordHash = "";

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await hash(randomBytes(32), {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1
    });
  }

  async getOrCreateCsrfSession(rawSessionToken?: string): Promise<IssuedSession> {
    const existing = rawSessionToken
      ? await this.prisma.session.findUnique({
          where: { tokenHash: this.hash(rawSessionToken) },
          select: SESSION_SELECT
        })
      : null;

    if (existing && existing.expiresAt > new Date()) {
      const csrfToken = this.randomToken();
      await this.prisma.session.update({
        where: { id: existing.id },
        data: { csrfTokenHash: this.hash(csrfToken), lastUsedAt: new Date() }
      });
      return { sessionToken: rawSessionToken!, csrfToken };
    }

    return this.issueSession(null, existing?.id);
  }

  async register(input: RegisterDto, previousSessionId: string): Promise<IssuedSession & { user: PublicUser }> {
    const email = this.normalizeEmail(input.email);
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException("Alamat email sudah terdaftar.");
    }

    if (input.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: input.departmentId,
          deletedAt: null,
          faculty: { deletedAt: null }
        },
        select: { id: true }
      });
      if (!department) throw new NotFoundException("Program studi aktif tidak ditemukan.");
    }

    const passwordHash = await hash(input.password, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1
    });
    const sessionToken = this.randomToken();
    const csrfToken = this.randomToken();
    const now = new Date();

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            name: input.name.trim(),
            email,
            passwordHash,
            role: UserRole.KONTRIBUTOR,
            departmentId: input.departmentId
          }
        });
        await transaction.session.create({
          data: {
            tokenHash: this.hash(sessionToken),
            csrfTokenHash: this.hash(csrfToken),
            userId: created.id,
            expiresAt: new Date(now.getTime() + SESSION_DURATION_MS)
          }
        });
        await transaction.session.deleteMany({ where: { id: previousSessionId } });
        return created;
      });

      return { sessionToken, csrfToken, user: this.toPublicUser(user) };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Alamat email sudah terdaftar.");
      }
      throw error;
    }
  }

  async login(input: LoginDto, previousSessionId: string): Promise<IssuedSession & { user: PublicUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(input.email) }
    });

    if (!user) {
      await verify(this.dummyPasswordHash, input.password);
      throw new UnauthorizedException("Email atau kata sandi tidak sesuai.");
    }

    const passwordMatches = await verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Email atau kata sandi tidak sesuai.");
    }

    const issued = await this.issueSession(user.id, previousSessionId);
    return { ...issued, user: this.toPublicUser(user) };
  }

  async logout(sessionId: string): Promise<IssuedSession> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
    return this.issueSession(null);
  }

  async me(rawSessionToken?: string): Promise<{ user: PublicUser | null }> {
    if (!rawSessionToken) return { user: null };
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(rawSessionToken) },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date() || !session.user) {
      return { user: null };
    }
    return { user: this.toPublicUser(session.user) };
  }

  async requestRecovery(input: RecoveryRequestDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(input.email);
    const genericMessage = "Jika alamat email terdaftar, instruksi pemulihan akan dikirim.";
    const mailSettings = this.getRecoveryMailSettings();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });
    if (!user) return { message: genericMessage };

    const token = this.randomToken();
    const expiresAt = new Date(Date.now() + RECOVERY_DURATION_MS);
    const recovery = await this.prisma.$transaction(async (transaction) => {
      await transaction.recoveryToken.deleteMany({
        where: { userId: user.id, usedAt: null }
      });
      return transaction.recoveryToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hash(token),
          expiresAt
        }
      });
    });

    try {
      const origin = this.readOrigin(mailSettings.origin);
      const resetUrl = new URL("/reset-password", origin);
      resetUrl.searchParams.set("token", token);
      const transport = nodemailer.createTransport({
        host: mailSettings.host,
        port: mailSettings.port,
        secure: mailSettings.secure,
        auth: mailSettings.user
          ? { user: mailSettings.user, pass: mailSettings.password }
          : undefined
      });
      await transport.sendMail({
        from: mailSettings.from,
        to: user.email,
        subject: "Pemulihan akun Siap Ujian",
        text: `Gunakan tautan berikut untuk mengganti kata sandi. Tautan berlaku 30 menit: ${resetUrl.toString()}`,
        html: `<p>Gunakan tautan berikut untuk mengganti kata sandi. Tautan berlaku 30 menit.</p><p><a href="${resetUrl.toString()}">Atur ulang kata sandi</a></p>`
      });
    } catch (error) {
      await this.prisma.recoveryToken.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() }
      });
      this.logger.error("Email pemulihan gagal dikirim; token pemulihan telah dibatalkan.");
    }

    return { message: genericMessage };
  }

  async completeRecovery(input: RecoveryCompleteDto): Promise<{ message: string }> {
    const tokenHash = this.hash(input.token);
    const recovery = await this.prisma.recoveryToken.findUnique({
      where: { tokenHash }
    });
    if (!recovery || recovery.usedAt || recovery.expiresAt <= new Date()) {
      throw new UnauthorizedException("Tautan pemulihan tidak berlaku atau telah kedaluwarsa.");
    }

    const passwordHash = await hash(input.password, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1
    });
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const claim = await transaction.recoveryToken.updateMany({
        where: {
          id: recovery.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: { usedAt: now }
      });
      if (claim.count !== 1) {
        throw new UnauthorizedException("Tautan pemulihan tidak berlaku atau telah kedaluwarsa.");
      }
      await transaction.user.update({
        where: { id: recovery.userId },
        data: { passwordHash }
      });
      await transaction.session.deleteMany({
        where: { userId: recovery.userId }
      });
      await transaction.recoveryToken.updateMany({
        where: { userId: recovery.userId, usedAt: null },
        data: { usedAt: now }
      });
    });
    return { message: "Kata sandi berhasil diperbarui. Silakan masuk kembali." };
  }

  private async issueSession(userId: string | null, previousSessionId?: string): Promise<IssuedSession> {
    const sessionToken = this.randomToken();
    const csrfToken = this.randomToken();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.session.create({
        data: {
          tokenHash: this.hash(sessionToken),
          csrfTokenHash: this.hash(csrfToken),
          userId,
          expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
        }
      });
      if (previousSessionId) {
        await transaction.session.deleteMany({ where: { id: previousSessionId } });
      }
    });
    return { sessionToken, csrfToken };
  }

  private getRecoveryMailSettings(): {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
    origin: string;
  } {
    const host = this.config.get<string>("SMTP_HOST");
    const from = this.config.get<string>("SMTP_FROM");
    const origin = this.config.get<string>("APP_ORIGIN");
    const portValue = this.config.get<string>("SMTP_PORT");
    if (!host || !from || !origin || !portValue) {
      throw new ServiceUnavailableException("Pemulihan akun belum dikonfigurasi. Hubungi administrator.");
    }

    const port = Number(portValue);
    this.readOrigin(origin);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new ServiceUnavailableException("Konfigurasi layanan pemulihan akun tidak valid.");
    }

    return {
      host,
      port,
      secure: this.config.get<string>("SMTP_SECURE") === "true" || port === 465,
      user: this.config.get<string>("SMTP_USER"),
      password: this.config.get<string>("SMTP_PASSWORD"),
      from,
      origin
    };
  }

  private readOrigin(value: string): string {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
        throw new Error("APP_ORIGIN produksi harus menggunakan HTTPS.");
      }
      return url.origin;
    } catch {
      throw new ServiceUnavailableException("APP_ORIGIN untuk pemulihan akun tidak valid.");
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLocaleLowerCase("en-US");
  }

  private randomToken(): string {
    return randomBytes(32).toString("base64url");
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    departmentId: string | null;
    createdAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      createdAt: user.createdAt
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "P2002";
  }
}
