/* eslint-disable @typescript-eslint/no-explicit-any */
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SummariesService } from './summaries.service';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { QuerySummariesDto } from './dto/query-summaries.dto';

@ApiTags('summaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessSummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Post(':id/summaries')
  @ApiOperation({ summary: 'Record a manual summary for an external business' })
  async create(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateSummaryDto) {
    return this.summariesService.create(user.id, id, dto);
  }

  @Get(':id/summaries/latest')
  @ApiOperation({ summary: 'Get the latest summary for an external business' })
  async findLatest(@CurrentUser() user: any, @Param('id') id: string) {
    return this.summariesService.findLatest(user.id, id);
  }

  @Get(':id/summaries')
  @ApiOperation({ summary: 'List summary history for an external business' })
  async findAll(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: QuerySummariesDto,
  ) {
    return this.summariesService.findAll(user.id, id, query);
  }
}
