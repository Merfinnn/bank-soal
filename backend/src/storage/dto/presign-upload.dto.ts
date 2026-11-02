import { StorageUploadKind } from "@prisma/client";
import { IsEnum, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { MAX_UPLOAD_BYTES } from "../storage.constants";

export class PresignUploadDto {
  @IsEnum(StorageUploadKind)
  kind!: StorageUploadKind;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/^[^\\/:*?"<>|\u0000-\u001f]+$/)
  originalName!: string;

  @IsString()
  @IsIn(["application/pdf", "image/png", "image/jpeg"])
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  sizeBytes!: number;
}
