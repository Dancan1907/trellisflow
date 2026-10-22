import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({ example: 'Main Checking' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'Safaricom' })
  @IsString()
  @IsOptional()
  institution?: string;
}
