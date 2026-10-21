import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  Length,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ enum: CategoryType, example: 'EXPENSE' })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({ description: 'UUID of parent category (for nesting)' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ example: 'shopping-cart' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#10b981' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 0, description: 'Sort order for UI display' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
