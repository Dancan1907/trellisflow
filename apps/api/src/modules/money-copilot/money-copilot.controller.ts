import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MoneyCopilotChatDto } from './dto/money-copilot-chat.dto';
import { MoneyCopilotService } from './money-copilot.service';

@ApiTags('Money Copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('money-copilot')
export class MoneyCopilotController {
  constructor(private readonly copilot: MoneyCopilotService) {}

  @Post('chat')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @ApiOperation({ summary: 'Ask a read-only question about your TrellisFlow finances' })
  chat(@CurrentUser() user: { id: string }, @Body() dto: MoneyCopilotChatDto) {
    return this.copilot.chat(user.id, dto);
  }
}
