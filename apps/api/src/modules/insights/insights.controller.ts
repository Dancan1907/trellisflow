import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/* eslint-disable @typescript-eslint/no-explicit-any */
@ApiTags('insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active insights' })
  async findAll(@CurrentUser() user: any) {
    return this.insightsService.findAll(user.id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate insights by running the rules engine' })
  async generate(@CurrentUser() user: any) {
    return this.insightsService.generateForUser(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dismiss a single insight' })
  async dismiss(@CurrentUser() user: any, @Param('id') id: string) {
    return this.insightsService.dismiss(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Dismiss all active insights' })
  async dismissAll(@CurrentUser() user: any) {
    return this.insightsService.dismissAll(user.id);
  }
}
