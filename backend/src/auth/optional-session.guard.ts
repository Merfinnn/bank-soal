import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { SESSION_COOKIE_NAME } from "./auth.constants";
import type { AuthenticatedRequest } from "./auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawToken = request.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken) return true;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: createHash("sha256").update(rawToken).digest("hex") },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date() || !session.user) return true;

    request.authUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      departmentId: session.user.departmentId,
      createdAt: session.user.createdAt
    };
    return true;
  }
}
