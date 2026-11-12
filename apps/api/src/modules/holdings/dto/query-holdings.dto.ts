import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetClass, HoldingStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryHoldingsDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by container',
  })
  @IsOptional()
  @IsUUID()
  containerId?: string;

  @ApiPropertyOptional({ enum: AssetClass, example: 'STOCK' })
  @IsOptional()
  @IsEnum(AssetClass)
  assetClass?: AssetClass;

  @ApiPropertyOptional({ enum: HoldingStatus, example: 'OPEN' })
  @IsOptional()
  @IsEnum(HoldingStatus)
  status?: HoldingStatus;

  @ApiPropertyOptional({ description: 'Search by name or symbol' })
  @IsOptional()
  @IsString()
  search?: string;
}
