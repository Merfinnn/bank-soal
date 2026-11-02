import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { PUBLIC_ROUTE_KEY } from "./auth.decorators";
import { SESSION_COOKIE_NAME } from "./auth.constants";
import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawToken = request.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken) throw new UnauthorizedException("Silakan masuk terlebih dahulu.");

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: createHash("sha256").update(rawToken).digest("hex") },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date() || !session.user) {
      throw new UnauthorizedException("Sesi telah berakhir. Silakan masuk kembali.");
    }

    request.authSession = session;
    request.authUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      departmentId: session.user.departmentId,
      createdAt: session.user.createdAt
    };
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() }
    });
    return true;
  }
}
