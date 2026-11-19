import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
