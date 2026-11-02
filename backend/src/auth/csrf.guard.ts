import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "./auth.constants";
import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.assertSameOrigin(request);

    const rawSessionToken = request.cookies?.[SESSION_COOKIE_NAME];
    const csrfToken = request.get(CSRF_HEADER_NAME);
    if (!rawSessionToken || !csrfToken) {
      throw new ForbiddenException("Token keamanan sesi tidak tersedia.");
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(rawSessionToken) }
    });
    if (!session || session.expiresAt <= new Date()) {
      throw new ForbiddenException("Sesi keamanan tidak berlaku. Muat ulang halaman dan coba lagi.");
    }

    const expected = Buffer.from(session.csrfTokenHash, "hex");
    const actual = Buffer.from(this.hash(csrfToken), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new ForbiddenException("Token keamanan permintaan tidak valid.");
    }

    request.authSession = session;
    return true;
  }

  private assertSameOrigin(request: AuthenticatedRequest): void {
    const origin = request.get("origin");
    const referer = request.get("referer");
    const source = origin ?? (referer ? this.readOrigin(referer) : null);
    const configuredOrigin = this.config.get<string>("APP_ORIGIN");
    const expected = configuredOrigin
      ? this.readOrigin(configuredOrigin)
      : this.readOrigin(`${request.protocol}://${request.get("host") ?? ""}`);

    if (!source || !expected || source !== expected) {
      throw new ForbiddenException("Asal permintaan tidak diizinkan.");
    }
  }

  private readOrigin(value: string): string | null {
    try {
      const url = new URL(value);
      return url.origin;
    } catch {
      return null;
    }
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
