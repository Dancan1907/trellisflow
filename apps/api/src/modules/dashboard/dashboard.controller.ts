import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/* eslint-disable @typescript-eslint/no-explicit-any */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get the hero summary (Net worth + Cash flow)' })
  async getSummary(@CurrentUser() user: any) {
    return this.dashboardService.getSummary(user.id);
  }

  @Get('containers')
  @ApiOperation({ summary: 'Get container cards with net worth and account counts' })
  async getContainerCards(@CurrentUser() user: any) {
    return this.dashboardService.getContainerCards(user.id);
  }

  @Get('net-worth-trend')
  @ApiOperation({ summary: 'Get net worth trend for the chart' })
  async getNetWorthTrend(@CurrentUser() user: any, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getNetWorthTrend(user.id, daysNum);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get top 3 active insights for the dashboard' })
  async getInsights(@CurrentUser() user: any) {
    return this.dashboardService.getInsights(user.id);
  }
}
