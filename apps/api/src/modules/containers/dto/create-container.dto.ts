import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, Length } from 'class-validator';
import { ContainerType } from '@prisma/client';

export class CreateContainerDto {
  @ApiProperty({ example: 'My Side Business' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ enum: ContainerType, example: 'INTERNAL_BUSINESS' })
  @IsEnum(ContainerType)
  type: ContainerType;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  currency: string;
}
