import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsUUID, Length } from 'class-validator';
import { AccountCategory, AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ example: 'M-Pesa Wallet' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ enum: AccountCategory, example: 'ASSET' })
  @IsEnum(AccountCategory)
  category: AccountCategory;

  @ApiProperty({ enum: AccountType, example: 'MOBILE_MONEY' })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiPropertyOptional({ example: 5000, description: 'Optional starting balance' })
  @IsNumber()
  @IsOptional()
  initialBalance?: number;

  @ApiProperty({ description: 'The UUID of the container this account belongs to' })
  @IsUUID()
  containerId: string;

  @ApiPropertyOptional({ example: 'Safaricom' })
  @IsString()
  @IsOptional()
  institution?: string;
}
