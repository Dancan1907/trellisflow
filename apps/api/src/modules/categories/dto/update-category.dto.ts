import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length, IsInt, Min } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'shopping-cart' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#10b981' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
