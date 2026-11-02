import type { Request } from "express";
import type { UserRole } from "@prisma/client";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  createdAt: Date;
};

export type SessionContext = {
  id: string;
  userId: string | null;
  csrfTokenHash: string;
  expiresAt: Date;
};

export type AuthenticatedRequest = Request & {
  authSession?: SessionContext;
  authUser?: PublicUser;
};
