/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SummariesService } from './summaries.service';
import { UpdateSummaryDto } from './dto/update-summary.dto';

@ApiTags('summaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('summaries')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Post('process-stale')
  @ApiOperation({ summary: 'Detect stale external-business summaries and create insights' })
  async processStale(@CurrentUser() user: any, @Query('days') days?: string) {
    let threshold: number | undefined;

    if (days !== undefined) {
      threshold = Number.parseInt(days, 10);
      if (!Number.isInteger(threshold) || threshold < 1 || threshold > 3650) {
        throw new BadRequestException('`days` must be an integer between 1 and 3650');
      }
    }

    return this.summariesService.processStale(user.id, threshold);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List the correction history of a summary' })
  async findVersions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.summariesService.findVersions(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Correct a summary, preserving the previous values as a version' })
  async correct(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateSummaryDto) {
    return this.summariesService.correct(user.id, id, dto);
  }
}
