import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateContainerDto {
  @ApiPropertyOptional({ example: 'Updated Business Name' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  // Note: We intentionally do not allow changing the `type` or `currency`
  // of a container after creation, as this would break historical data.
}
