import { IsIn } from "class-validator";

export class DownloadExamPaperDto {
  @IsIn(["soal", "pembahasan"])
  jenis!: "soal" | "pembahasan";
}
