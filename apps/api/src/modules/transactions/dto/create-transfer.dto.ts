import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsDateString, IsOptional, Length, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ description: 'The account money is leaving' })
  @IsUUID()
  fromAccountId: string;

  @ApiProperty({ description: 'The account money is arriving in' })
  @IsUUID()
  toAccountId: string;

  @ApiProperty({ example: 1000.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-10-20' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Moved to savings' })
  @IsString()
  @Length(1, 200)
  description: string;

  @ApiPropertyOptional({ description: 'Per-user idempotency key for safe transfer retries' })
  @IsUUID()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'Monthly savings' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'ABC123XYZ9', description: 'M-Pesa reference stored on the matching wallet-side transfer row' })
  @IsString()
  @Length(1, 32)
  @IsOptional()
  mpesaReference?: string;

  @ApiPropertyOptional({ description: 'Account whose transfer row should carry the M-Pesa reference' })
  @IsUUID()
  @IsOptional()
  mpesaReferenceAccountId?: string;

  @ApiPropertyOptional({ description: 'SHA-256 fingerprint of a confirmed M-Pesa receipt image' })
  @IsString()
  @Length(64, 64)
  @IsOptional()
  receiptImageHash?: string;
}
