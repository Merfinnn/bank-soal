import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ApproveExamPaperDto {
  @IsBoolean()
  confirmNoActiveLeak!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
