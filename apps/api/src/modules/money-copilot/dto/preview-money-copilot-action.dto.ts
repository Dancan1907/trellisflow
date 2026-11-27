import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class PreviewMoneyCopilotActionDto {
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  @IsIn(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: '2026-11-27' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Groceries' })
  @IsString()
  @Length(1, 200)
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @Length(0, 1000)
  @IsOptional()
  notes?: string;
}
