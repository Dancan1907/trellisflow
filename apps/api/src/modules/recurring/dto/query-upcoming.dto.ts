import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUpcomingDto {
  @ApiPropertyOptional({ example: 30, default: 30, description: 'Look ahead X days' })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;
}
