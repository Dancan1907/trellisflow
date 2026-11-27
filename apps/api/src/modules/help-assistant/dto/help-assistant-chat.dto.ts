import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
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
  @IsNotEmpty()
  @MaxLength(1200)
  message!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => HelpAssistantHistoryMessageDto)
  history?: HelpAssistantHistoryMessageDto[];
}
