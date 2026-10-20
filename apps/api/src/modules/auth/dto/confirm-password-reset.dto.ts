import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: 'The token received via email (or devToken)' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword123', description: 'Must be at least 8 characters' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
