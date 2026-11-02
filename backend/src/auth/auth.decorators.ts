import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@prisma/client";

export const PUBLIC_ROUTE_KEY = "publicRoute";
export const REQUIRED_ROLES_KEY = "requiredRoles";

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
