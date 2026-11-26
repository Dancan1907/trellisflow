import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CashFlowForecastQueryDto {
  @ApiPropertyOptional({ example: 90, default: 90, minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  horizonDays?: number = 90;

  @ApiPropertyOptional({ example: 90, default: 90, minimum: 30, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(365)
  historyDays?: number = 90;

  @ApiPropertyOptional({ example: '2026-11-27', description: 'Forecast start date (UTC calendar date)' })
  @IsOptional()
  @IsDateString()
  asOf?: string;

  @ApiPropertyOptional({ example: 10, description: 'Scenario adjustment to variable historical income, from -100 to 1000 percent' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-100)
  @Max(1000)
  incomeAdjustmentPercent?: number = 0;

  @ApiPropertyOptional({ example: 15, description: 'Scenario adjustment to variable historical expenses, from -100 to 1000 percent' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-100)
  @Max(1000)
  expenseAdjustmentPercent?: number = 0;
}
