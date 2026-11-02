import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CsrfGuard } from "./csrf.guard";
import { RolesGuard } from "./roles.guard";
import { SessionAuthGuard } from "./session-auth.guard";
import { OptionalSessionGuard } from "./optional-session.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, CsrfGuard, SessionAuthGuard, OptionalSessionGuard, RolesGuard],
  exports: [AuthService, SessionAuthGuard, OptionalSessionGuard, RolesGuard]
})
export class AuthModule {}
