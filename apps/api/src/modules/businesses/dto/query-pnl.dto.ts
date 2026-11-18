import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QueryPnlDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start of the range (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-01-31', description: 'End of the range (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
