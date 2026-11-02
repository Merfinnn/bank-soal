import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Public, Roles } from "../auth/auth.decorators";
import { AuthenticatedRequest } from "../auth/auth.types";
import { CsrfGuard } from "../auth/csrf.guard";
import { DownloadExamPaperDto } from "./dto/download-exam-paper.dto";
import { ListExamPapersDto } from "./dto/list-exam-papers.dto";
import { SubmitExamPaperDto } from "./dto/submit-exam-paper.dto";
import { ExamPapersService } from "./exam-papers.service";

@Controller("exam-papers")
export class ExamPapersController {
  constructor(private readonly examPapers: ExamPapersService) {}

  @Get()
  @Public()
  getCatalog(@Query() query: ListExamPapersDto) {
    return this.examPapers.listApproved(query);
  }

  @Get(":paperId")
  @Public()
  getApprovedDetail(@Param("paperId") paperId: string) {
    return this.examPapers.getApprovedDetail(paperId);
  }

  @Get(":paperId/download-url")
  @Public()
  @Header("Cache-Control", "no-store")
  getApprovedDownloadUrl(
    @Param("paperId") paperId: string,
    @Query() query: DownloadExamPaperDto
  ) {
    return this.examPapers.getApprovedDownloadUrl(paperId, query.jenis);
  }

  @Post()
  @Roles(UserRole.KONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN)
  @UseGuards(CsrfGuard)
  submit(@Body() input: SubmitExamPaperDto, @Req() request: AuthenticatedRequest) {
    return this.examPapers.submit(request.authUser!, input);
  }
}
