// ============================================================================
// Signup DTO
// ============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { PersonaHint } from '@prisma/client';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com', description: "The user's email address" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Must be at least 8 characters' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'Jane Doe', description: "The user's display name" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Africa/Nairobi', description: 'IANA timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'KES', description: 'ISO 4217 currency code' })
  @IsString()
  @IsOptional()
  reportingCurrency?: string;

  @ApiPropertyOptional({
    enum: PersonaHint,
    description: 'Optional hint to pre-configure the dashboard',
  })
  @IsEnum(PersonaHint)
  @IsOptional()
  personaHint?: PersonaHint;
}
