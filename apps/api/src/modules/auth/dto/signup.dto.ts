// ============================================================================
// Signup DTO
// ============================================================================
// Defines the shape of the request body for POST /api/auth/signup.
// class-validator handles the validation before it reaches the service.

import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { PersonaHint } from '@prisma/client';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  reportingCurrency?: string;

  @IsEnum(PersonaHint)
  @IsOptional()
  personaHint?: PersonaHint;
}
