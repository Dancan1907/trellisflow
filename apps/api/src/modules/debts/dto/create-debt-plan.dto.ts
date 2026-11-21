import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { DebtMethod } from '@prisma/client';

export class CreateDebtPlanDto {
  @ApiProperty({ description: 'The ID of the liability account (Credit Card, Loan, etc.)' })
  @IsUUID()
  accountId: string;

  @ApiProperty({ example: 500.0, description: 'Minimum monthly payment required' })
  @IsNumber()
  @Min(0)
  minimumPayment: number;

  @ApiProperty({ example: 18.5, description: 'Annual interest rate (e.g., 18.5 for 18.5%)' })
  @IsNumber()
  @Min(0)
  interestRate: number;

  @ApiPropertyOptional({ enum: DebtMethod, example: 'SNOWBALL' })
  @IsEnum(DebtMethod)
  @IsOptional()
  method?: DebtMethod;

  @ApiPropertyOptional({ example: 'Paying off the Visa card first' })
  @IsString()
  @IsOptional()
  notes?: string;
}
