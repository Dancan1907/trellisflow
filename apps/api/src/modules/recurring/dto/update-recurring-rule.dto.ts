import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsDateString, IsOptional, Min, Length } from 'class-validator';

export class UpdateRecurringRuleDto {
  @ApiPropertyOptional({ example: 16000 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Updated Rent Description' })
  @IsString()
  @Length(1, 200)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
