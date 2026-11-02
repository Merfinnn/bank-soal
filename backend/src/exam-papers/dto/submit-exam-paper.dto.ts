import { ExamType } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

const TAHUN_MAKSIMUM = new Date().getFullYear() + 1;

export class SubmitExamPaperDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  courseId!: string;

  @IsInt()
  @Min(2000)
  @Max(TAHUN_MAKSIMUM)
  examYear!: number;

  @IsEnum(ExamType)
  examType!: ExamType;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  topicName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  examUploadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  answerUploadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  questionText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30_000)
  explanation?: string;

  @IsBoolean()
  distributionRightsConfirmed!: boolean;
}
