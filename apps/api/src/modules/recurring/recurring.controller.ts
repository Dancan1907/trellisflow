// ============================================================================
// Recurring Controller
// ============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecurringService } from './recurring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto';
import { UpdateRecurringRuleDto } from './dto/update-recurring-rule.dto';
import { QueryUpcomingDto } from './dto/query-upcoming.dto';

@ApiTags('recurring-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring-rules')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Get()
  @ApiOperation({ summary: 'List all recurring rules' })
  async findAll(@CurrentUser() user: any) {
    return this.recurringService.findAllForUser(user.id);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming occurrences within X days' })
  async getUpcoming(@CurrentUser() user: any, @Query() query: QueryUpcomingDto) {
    return this.recurringService.getUpcoming(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single recurring rule' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recurringService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new recurring rule' })
  async create(@CurrentUser() user: any, @Body() dto: CreateRecurringRuleDto) {
    return this.recurringService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring rule' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringRuleDto,
  ) {
    return this.recurringService.update(user.id, id, dto);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a recurring rule' })
  async pause(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recurringService.pause(user.id, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a paused recurring rule' })
  async resume(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recurringService.resume(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recurring rule' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recurringService.remove(user.id, id);
  }

  @Post('process-due')
  @ApiOperation({
    summary: 'Trigger the daily generator job',
    description: 'Normally called by a cron job. Processes all due recurring rules.',
  })
  async processDue() {
    // Note: In production, this should be protected by a secret header
    // so random users can't trigger it.
    return this.recurringService.generateDueTransactions();
  }
}
