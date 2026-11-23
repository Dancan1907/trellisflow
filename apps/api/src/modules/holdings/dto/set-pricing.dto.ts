import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PricingMode } from '@prisma/client';

export class SetPricingDto {
  @ApiProperty({ enum: PricingMode, example: 'AUTO' })
  @IsEnum(PricingMode)
  pricingMode!: PricingMode;

  @ApiPropertyOptional({
    example: 'AAPL',
    description: 'Symbol in the format the selected provider expects',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  providerSymbol?: string;

  @ApiPropertyOptional({
    example: 'finnhub',
    description: 'Preferred provider (alpha_vantage | finnhub | coingecko)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  priceProvider?: string;
}
