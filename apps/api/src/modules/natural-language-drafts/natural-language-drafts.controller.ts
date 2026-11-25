import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNaturalLanguageDraftDto } from './dto/create-natural-language-draft.dto';
import { ConfirmNaturalLanguageDraftDto } from './dto/confirm-natural-language-draft.dto';
import { NaturalLanguageDraftsService } from './natural-language-drafts.service';

@ApiTags('Natural-language transaction drafts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions/natural-language')
export class NaturalLanguageDraftsController {
  constructor(private readonly drafts: NaturalLanguageDraftsService) {}

  @Post('draft')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a reviewable transaction draft from natural language' })
  createDraft(@CurrentUser() user: { id: string }, @Body() dto: CreateNaturalLanguageDraftDto) {
    return this.drafts.createDraft(user.id, dto);
  }

  @Post('confirm')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @ApiOperation({ summary: 'Confirm and save an edited natural-language transaction draft' })
  confirm(@CurrentUser() user: { id: string }, @Body() dto: ConfirmNaturalLanguageDraftDto) {
    return this.drafts.confirm(user.id, dto);
  }
}
