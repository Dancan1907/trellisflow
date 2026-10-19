// ============================================================================
// Refresh Token DTO
// ============================================================================
// Note: In the actual web app, the refresh token comes from an httpOnly cookie.
// But mobile apps will send it in the body. This DTO supports both.

import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
