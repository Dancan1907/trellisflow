import { Body, Controller, Get, Post, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../api-tokens/guards/api-key.guard';
import { SummariesService } from '../summaries/summaries.service';
import { CreateSummaryDto } from '../summaries/dto/create-summary.dto';
import { BulkCreateSummaryDto } from './dto/bulk-create-summary.dto';

@ApiTags('Public API (v1)')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } }) // Stricter limit: 60 requests per minute
@Controller('v1')
export class ExternalApiController {
  constructor(private readonly summariesService: SummariesService) {}

  @Get('business')
  @ApiOperation({ summary: 'Get the current business details' })
  async getBusiness(@Req() req: any) {
    const container = req.container;
    return {
      id: container.id,
      name: container.name,
      currency: container.currency,
      type: container.type,
    };
  }

  @Get('summary/latest')
  @ApiOperation({ summary: 'Get the latest summary for this business' })
  async getLatestSummary(@Req() req: any) {
    const container = req.container;
    return this.summariesService.findLatest(container.userId, container.id);
  }

  @Post('summary')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a single summary' })
  async createSummary(@Req() req: any, @Body() dto: CreateSummaryDto) {
    const container = req.container;
    return this.createIdempotentSummary(container, dto);
  }

  @Post('summary/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit multiple summaries in one request' })
  async createBulkSummaries(@Req() req: any, @Body() dto: BulkCreateSummaryDto) {
    const container = req.container;
    const results = await Promise.allSettled(
      dto.summaries.map((summary) => this.createIdempotentSummary(container, summary)),
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? { status: 'success', data: result.value }
        : { status: 'error', message: result.reason.message },
    );
  }

  // Helper to handle idempotency gracefully
  private async createIdempotentSummary(container: any, dto: CreateSummaryDto) {
    try {
      return await this.summariesService.create(container.userId, container.id, dto);
    } catch (error) {
      // If it's a ConflictException (duplicate date + unit), return the existing record
      if (error.status === 409) {
        const existing = await this.summariesService.findAll(container.userId, container.id);
        const match = existing.items.find(
          (s) => s.date === dto.date.slice(0, 10) && s.unit === (dto.unit?.trim() || null),
        );
        if (match) return match;
      }
      throw error;
    }
  }
}
