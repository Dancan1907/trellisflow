import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MoneyCopilotChatDto } from './dto/money-copilot-chat.dto';
import { MoneyCopilotService } from './money-copilot.service';
import { MoneyCopilotActionsService } from './money-copilot-actions.service';
import { PreviewMoneyCopilotActionDto } from './dto/preview-money-copilot-action.dto';
import { ConfirmMoneyCopilotActionDto } from './dto/confirm-money-copilot-action.dto';

@ApiTags('Money Copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('money-copilot')
export class MoneyCopilotController {
  constructor(
    private readonly copilot: MoneyCopilotService,
    private readonly actions: MoneyCopilotActionsService,
  ) {}

  @Post('actions/preview')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a time-limited preview for an income or expense transaction' })
  previewAction(@CurrentUser() user: { id: string }, @Body() dto: PreviewMoneyCopilotActionDto) {
    return this.actions.preview(user.id, dto);
  }

  @Post('actions/confirm')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Explicitly confirm a previously previewed transaction' })
  confirmAction(@CurrentUser() user: { id: string }, @Body() dto: ConfirmMoneyCopilotActionDto) {
    return this.actions.confirm(user.id, dto.actionId);
  }

  @Post('chat')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @ApiOperation({ summary: 'Ask a read-only question about your TrellisFlow finances' })
  chat(@CurrentUser() user: { id: string }, @Body() dto: MoneyCopilotChatDto) {
    return this.copilot.chat(user.id, dto);
  }
}
