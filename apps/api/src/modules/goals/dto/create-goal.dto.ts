import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, IsDateString, Min, Length } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ example: 'Emergency Fund' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 50000, description: 'Target amount to save' })
  @IsNumber()
  @Min(1)
  targetAmount: number;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({ description: 'The container this goal belongs to (e.g., Personal)' })
  @IsUUID()
  containerId: string;

  @ApiPropertyOptional({ example: '2027-12-31', description: 'Optional deadline' })
  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Optional: Link to an account to auto-track progress' })
  @IsUUID()
  @IsOptional()
  linkedAccountId?: string;

  @ApiPropertyOptional({ example: 'My backup money', description: 'Optional note' })
  @IsString()
  @IsOptional()
  notes?: string;
}
