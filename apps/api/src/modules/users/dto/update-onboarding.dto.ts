import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ description: 'Has the user seen the initial welcome modal?' })
  @IsOptional()
  @IsBoolean()
  hasSeenWelcome?: boolean;

  @ApiPropertyOptional({ description: 'Has the user completed the quick tour?' })
  @IsOptional()
  @IsBoolean()
  quickTourCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Has the user skipped the quick tour?' })
  @IsOptional()
  @IsBoolean()
  quickTourSkipped?: boolean;
}
