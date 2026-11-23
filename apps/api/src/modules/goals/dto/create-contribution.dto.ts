import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString, IsString, Length } from 'class-validator';

export class CreateContributionDto {
  @ApiProperty({
    example: 5000,
    description: 'Amount saved. Use a negative number for a withdrawal.',
  })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: '2026-11-21', description: 'Defaults to today' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'November savings' })
  @IsString()
  @Length(1, 200)
  @IsOptional()
  note?: string;
}
