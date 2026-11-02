import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../auth/auth.decorators";
import { AuthenticatedRequest } from "../auth/auth.types";
import { CsrfGuard } from "../auth/csrf.guard";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { DiscussionsService } from "./discussions.service";

@Controller(["exam-papers", "api/exams"])
export class DiscussionsController {
  constructor(private readonly discussions: DiscussionsService) {}

  @Get(":paperId/comments")
  @Public()
  list(@Param("paperId") paperId: string) {
    return this.discussions.listApprovedComments(paperId);
  }

  @Post(":paperId/comments")
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param("paperId") paperId: string,
    @Body() input: CreateCommentDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.discussions.createComment(paperId, request.authUser!.id, input);
  }
}
