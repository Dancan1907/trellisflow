// ============================================================================
// Refresh Token DTO
// ============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'The refresh token issued during login or signup',
  })
  @IsString()
  refreshToken: string;
}
