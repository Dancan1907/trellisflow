import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { BudgetPeriod } from '@prisma/client';

export class QueryBudgetsDto {
  @ApiPropertyOptional({ description: 'Filter by container' })
  @IsUUID()
  @IsOptional()
  containerId?: string;

  @ApiPropertyOptional({ enum: BudgetPeriod })
  @IsEnum(BudgetPeriod)
  @IsOptional()
  period?: BudgetPeriod;
}
