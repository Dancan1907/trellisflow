import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConvertToExternalDto {
  @ApiPropertyOptional({
    description:
      'Optional note recorded on the seed summary created from the internal business state at conversion time.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
