import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, Min, Length } from 'class-validator';

export class UpdateGoalDto {
  @ApiPropertyOptional({ example: 'New Car' })
  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 80000 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  targetAmount?: number;

  @ApiPropertyOptional({ example: '2028-06-30' })
  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({ example: 'Updated note' })
  @IsString()
  @IsOptional()
  notes?: string;
}
