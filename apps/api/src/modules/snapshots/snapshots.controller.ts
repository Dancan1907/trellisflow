// ============================================================================
// Snapshots / Reports Controller
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Post, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SnapshotsService } from './snapshots.service';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class SnapshotsController {
  constructor(
    private readonly snapshotsService: SnapshotsService,
    private readonly reportsService: ReportsService,
  ) {}

  @Post('snapshots/process-daily')
  @ApiOperation({ summary: 'Trigger daily snapshots' })
  async processDaily() {
    return this.snapshotsService.computeForAllUsers();
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Get net worth trend over time' })
  async getNetWorthTrend(@CurrentUser() user: any, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.reportsService.getNetWorthTrend(user.id, daysNum);
  }

  @Get('net-worth/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename=net-worth.pdf')
  @ApiOperation({ summary: 'Download net worth statement as PDF' })
  async downloadPDF(@CurrentUser() user: any, @Res() res: Response) {
    const pdfBuffer = await this.reportsService.generateNetWorthPDF(user.id);
    res.send(pdfBuffer);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Get cash flow for a date range' })
  async getCashFlow(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from
      ? new Date(from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    return this.reportsService.getCashFlow(user.id, fromDate, toDate);
  }

  @Get('allocation')
  @ApiOperation({ summary: 'Get net worth allocation by container' })
  async getAllocation(@CurrentUser() user: any) {
    return this.reportsService.getAllocation(user.id);
  }
}
