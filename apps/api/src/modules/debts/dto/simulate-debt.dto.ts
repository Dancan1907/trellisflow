import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { DebtMethod } from '@prisma/client';

export class SimulateDebtDto {
  @ApiProperty({ example: 5000, description: 'Extra money available per month to throw at debt' })
  @IsNumber()
  @Min(0)
  extraMonthlyPayment: number;

  @ApiPropertyOptional({ enum: DebtMethod, example: 'SNOWBALL' })
  @IsEnum(DebtMethod)
  method: DebtMethod;
}
