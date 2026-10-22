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

  @ApiPropertyOptional({ example: 'Monthly savings' })
  @IsString()
  @IsOptional()
  notes?: string;
}
