import { IsEmail, MaxLength } from "class-validator";

export class RecoveryRequestDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
