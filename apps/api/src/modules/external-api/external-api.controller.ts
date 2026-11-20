import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../api-tokens/guards/api-key.guard';
import {
  API_IP_THROTTLER,
  API_TOKEN_IP_RATE_LIMIT,
  API_TOKEN_RATE_LIMIT,
  API_TOKEN_RATE_TTL_MS,
  apiTokenTracker,
} from '../api-tokens/api-token-throttle';
import { ExternalApiService } from './external-api.service';
import { CreateSummaryDto } from '../summaries/dto/create-summary.dto';
import { BulkCreateSummaryDto } from './dto/bulk-create-summary.dto';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';

const IDEMPOTENCY_KEY_DOC = {
  name: 'Idempotency-Key',
  required: false,
  description:
    'UUID that makes the request safe to retry. Repeating the same request with the same key ' +
    'returns the original response (header Idempotent-Replayed: true) instead of running twice. ' +
    'Keys are remembered for 24 hours.',
};

@ApiTags('Public API (v1)')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
// Rate limits: 60 requests/minute PER API TOKEN (tracked by token hash), plus a per-IP backstop.
@Throttle({
  default: { limit: API_TOKEN_RATE_LIMIT, ttl: API_TOKEN_RATE_TTL_MS, getTracker: apiTokenTracker },
  [API_IP_THROTTLER]: { limit: API_TOKEN_IP_RATE_LIMIT, ttl: API_TOKEN_RATE_TTL_MS },
})
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
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader(IDEMPOTENCY_KEY_DOC)
  @ApiOperation({ summary: 'Submit a single summary' })
  async createSummary(@Req() req: any, @Body() dto: CreateSummaryDto) {
    return this.externalApiService.createSummary(req.container.userId, req.container.id, dto);
  }

  @Post('summary/bulk')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader(IDEMPOTENCY_KEY_DOC)
  @ApiOperation({ summary: 'Submit multiple summaries in one request' })
  async createBulkSummaries(@Req() req: any, @Body() dto: BulkCreateSummaryDto) {
    return this.externalApiService.createBulkSummaries(req.container.userId, req.container.id, dto);
  }
}
