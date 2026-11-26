import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

class MoneyCopilotHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @Length(1, 1000)
  content: string;
}

export class MoneyCopilotChatDto {
  @IsString()
  @Length(2, 2000)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => MoneyCopilotHistoryMessageDto)
  history?: MoneyCopilotHistoryMessageDto[];
}
