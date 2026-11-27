import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HelpAssistantChatDto } from './dto/help-assistant-chat.dto';
import { HelpAssistantService } from './help-assistant.service';

@ApiTags('Help Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('help-assistant')
export class HelpAssistantController {
  constructor(private readonly assistant: HelpAssistantService) {}
  @Post('chat')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @ApiOperation({ summary: 'Ask a question about using TrellisFlow' })
  chat(@CurrentUser() user: { id: string }, @Body() dto: HelpAssistantChatDto) {
    return this.assistant.chat(user.id, dto);
  }
}
