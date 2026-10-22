import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 20000, description: 'Update the target amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  rollover?: boolean;
}
