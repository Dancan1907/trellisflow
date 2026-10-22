import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, Length, Min } from 'class-validator';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ example: 2000 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @Length(1, 200)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Updated note' })
  @IsString()
  @IsOptional()
  notes?: string;
}
