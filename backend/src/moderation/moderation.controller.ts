import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "../auth/auth.types";
import { CsrfGuard } from "../auth/csrf.guard";
import { Roles } from "../auth/auth.decorators";
import { ApproveExamPaperDto } from "./dto/approve-exam-paper.dto";
import { RejectExamPaperDto } from "./dto/reject-exam-paper.dto";
import { ModerationService } from "./moderation.service";

@Controller("moderation/exam-papers")
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get()
  getPendingQueue() {
    return this.moderation.getPendingQueue();
  }

  @Patch(":paperId/approve")
  @UseGuards(CsrfGuard)
  approve(
    @Param("paperId") paperId: string,
    @Body() input: ApproveExamPaperDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.moderation.approve(paperId, request.authUser!.id, input);
  }

  @Patch(":paperId/reject")
  @UseGuards(CsrfGuard)
  reject(
    @Param("paperId") paperId: string,
    @Body() input: RejectExamPaperDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.moderation.reject(paperId, request.authUser!.id, input);
  }
}
