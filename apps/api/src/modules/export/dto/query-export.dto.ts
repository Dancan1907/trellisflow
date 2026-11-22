import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class QueryExportDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD) for transaction export' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD) for transaction export' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
