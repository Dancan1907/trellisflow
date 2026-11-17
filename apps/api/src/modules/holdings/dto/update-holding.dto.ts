import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';

export class UpdateHoldingDto {
  @ApiPropertyOptional({
    example: 'Safaricom Stock',
    description: 'The name of the holding',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Update total cost basis in reporting currency',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  costBasisTotal?: number;

  @ApiPropertyOptional({ example: 18000, description: 'Update current market value total' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentValueTotal?: number;

  @ApiPropertyOptional({ example: '2026-10-15', description: 'Update date the asset was acquired' })
  @IsOptional()
  @IsDateString()
  acquiredDate?: string;

  @ApiPropertyOptional({ description: 'Update free-form notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
