import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { InvestmentEventType } from '@prisma/client';

export class QueryInvestmentEventsDto {
  @ApiPropertyOptional({ description: 'Filter by container' })
  @IsOptional()
  @IsUUID()
  containerId?: string;

  @ApiPropertyOptional({ description: 'Filter by holding' })
  @IsOptional()
  @IsUUID()
  holdingId?: string;

  @ApiPropertyOptional({ enum: InvestmentEventType, example: 'BUY' })
  @IsOptional()
  @IsEnum(InvestmentEventType)
  eventType?: InvestmentEventType;

  @ApiPropertyOptional({ description: 'Search by notes text' })
  @IsOptional()
  @IsString()
  search?: string;
}
