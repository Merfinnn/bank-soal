import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { ExamPapersController } from "./exam-papers.controller";
import { AnalyticsController } from "./analytics.controller";
import { ExamPapersService } from "./exam-papers.service";

@Module({
  imports: [StorageModule],
  controllers: [ExamPapersController, AnalyticsController],
  providers: [ExamPapersService]
})
export class ExamPapersModule {}
