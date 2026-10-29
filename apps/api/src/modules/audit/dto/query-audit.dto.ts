import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE', 'UNARCHIVE'] as const;

export class QueryAuditDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Filter by entity type, e.g. Transaction, Account' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ enum: ACTIONS })
  @IsOptional()
  @IsString()
  @IsIn(ACTIONS)
  action?: string;
}
