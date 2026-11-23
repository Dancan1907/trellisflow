import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateSummaryDto } from '../../summaries/dto/create-summary.dto';

export class BulkCreateSummaryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateSummaryDto)
  summaries: CreateSummaryDto[];
}
