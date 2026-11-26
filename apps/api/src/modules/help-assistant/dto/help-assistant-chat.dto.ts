import { IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class HelpAssistantHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';
  @IsString()
  @MaxLength(1200)
  content!: string;
}

export class HelpAssistantChatDto {
  @IsString()
  @MaxLength(1200)
  message!: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HelpAssistantHistoryMessageDto)
  history?: HelpAssistantHistoryMessageDto[];
}
