import { Body, Controller, Get, Post, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../api-tokens/guards/api-key.guard';
import { ExternalApiService } from './external-api.service';
import { CreateSummaryDto } from '../summaries/dto/create-summary.dto';
import { BulkCreateSummaryDto } from './dto/bulk-create-summary.dto';

@ApiTags('Public API (v1)')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute per token
@Controller('v1')
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get('business')
  @ApiOperation({ summary: 'Get the current business details' })
  async getBusiness(@Req() req: any) {
    return this.externalApiService.getBusiness(req.container);
  }

  @Get('summary/latest')
  @ApiOperation({ summary: 'Get the latest summary for this business' })
  async getLatestSummary(@Req() req: any) {
    return this.externalApiService.getLatestSummary(req.container.userId, req.container.id);
  }

  @Post('summary')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a single summary' })
  async createSummary(@Req() req: any, @Body() dto: CreateSummaryDto) {
    return this.externalApiService.createSummary(req.container.userId, req.container.id, dto);
  }

  @Post('summary/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit multiple summaries in one request' })
  async createBulkSummaries(@Req() req: any, @Body() dto: BulkCreateSummaryDto) {
    return this.externalApiService.createBulkSummaries(req.container.userId, req.container.id, dto);
  }
}
