import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_ROTATION_GRACE_HOURS } from '../api-tokens.constants';

export class RotateApiTokenDto {
  /** Label for the new token. Defaults to the label of the token being rotated. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  /** Expiry of the new token. Defaults to 90 days from now. */
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  /**
   * Hours the OLD token keeps working so the external site can switch over
   * without downtime. `0` revokes the old token immediately.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ROTATION_GRACE_HOURS)
  gracePeriodHours?: number;
}
