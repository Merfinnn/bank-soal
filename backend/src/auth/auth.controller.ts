import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "./auth.constants";
import { CsrfGuard } from "./csrf.guard";
import { Public } from "./auth.decorators";
import type { AuthenticatedRequest } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { RecoveryCompleteDto } from "./dto/recovery-complete.dto";
import { RecoveryRequestDto } from "./dto/recovery-request.dto";
import { RegisterDto } from "./dto/register.dto";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/"
};

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("csrf")
  @Public()
  async csrf(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const issued = await this.authService.getOrCreateCsrfSession(sessionToken);
    response.cookie(SESSION_COOKIE_NAME, issued.sessionToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: SESSION_DURATION_MS
    });
    return { csrfToken: issued.csrfToken };
  }

  @Post("register")
  @Public()
  @UseGuards(CsrfGuard)
  async register(
    @Body() input: RegisterDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const issued = await this.authService.register(input, request.authSession!.id);
    this.writeSessionCookie(response, issued.sessionToken);
    return { user: issued.user, csrfToken: issued.csrfToken };
  }

  @Post("login")
  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async login(
    @Body() input: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const issued = await this.authService.login(input, request.authSession!.id);
    this.writeSessionCookie(response, issued.sessionToken);
    return { user: issued.user, csrfToken: issued.csrfToken };
  }

  @Post("logout")
  @Public()
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const issued = await this.authService.logout(request.authSession!.id);
    this.writeSessionCookie(response, issued.sessionToken);
    return { message: "Kamu berhasil keluar.", csrfToken: issued.csrfToken };
  }

  @Get("me")
  @Public()
  me(@Req() request: Request) {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    return this.authService.me(sessionToken);
  }

  @Post("recovery/request")
  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  requestRecovery(@Body() input: RecoveryRequestDto) {
    return this.authService.requestRecovery(input);
  }

  @Post("recovery/complete")
  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  completeRecovery(@Body() input: RecoveryCompleteDto) {
    return this.authService.completeRecovery(input);
  }

  private writeSessionCookie(response: Response, value: string): void {
    response.cookie(SESSION_COOKIE_NAME, value, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: SESSION_DURATION_MS
    });
  }
}
