import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExportService } from './export.service';
import { QueryExportDto } from './dto/query-export.dto';

@ApiTags('export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('json')
  @ApiOperation({ summary: 'Export all user data as JSON' })
  async exportJson(@CurrentUser() user: any, @Res() res: Response) {
    const data = await this.exportService.generateJson(user.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="trellisflow-export-${Date.now()}.json"`,
    );
    res.send(data);
  }

  @Get('csv')
  @ApiOperation({ summary: 'Export transactions as CSV' })
  async exportCsv(@CurrentUser() user: any, @Query() query: QueryExportDto, @Res() res: Response) {
    const csv = await this.exportService.generateCsv(user.id, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="trellisflow-transactions-${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Export net worth statement as PDF' })
  async exportPdf(@CurrentUser() user: any, @Res() res: Response) {
    const pdf = await this.exportService.generatePdf(user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="trellisflow-networth-${Date.now()}.pdf"`,
    );
    res.send(pdf);
  }
}
