import { Controller, Get, Header, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { randomBytes } from "node:crypto";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../auth/auth.decorators";
import { ANALYTICS_COOKIE_NAME } from "../auth/auth.constants";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import { ExamPapersService } from "./exam-papers.service";

@Controller("exams")
export class AnalyticsController {
  constructor(private readonly examPapers: ExamPapersService) {}

  @Post(":paperId/view")
  @Public()
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(OptionalSessionGuard)
  async recordApprovedView(
    @Param("paperId") paperId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    let visitorId = request.cookies?.[ANALYTICS_COOKIE_NAME];
    if (!request.authUser && !visitorId) {
      visitorId = randomBytes(32).toString("base64url");
      response.cookie(ANALYTICS_COOKIE_NAME, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 365 * 24 * 60 * 60 * 1000
      });
    }
    return this.examPapers.recordApprovedView(paperId, request.authUser?.id, visitorId);
  }

  @Get("stats/approved-count")
  @Public()
  @Header("Cache-Control", "no-store")
  getApprovedCount() {
    return this.examPapers.getApprovedCount();
  }

  @Get("stats/popular")
  @Public()
  @Header("Cache-Control", "no-store")
  getPopularPapers() {
    return this.examPapers.getPopularPapers();
  }
}
