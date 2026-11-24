import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  TooManyRequestsException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface AiUsageRecord {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Reserves daily request capacity atomically and stores privacy-safe usage
 * metadata. No prompt, SMS body, receipt bytes, or extraction payload is saved.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);
  private readonly feature = 'MPESA_IMPORT';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async reserveMpesaParse(userId: string): Promise<Date> {
    const now = new Date();
    const usageDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dateKey = usageDate.toISOString().slice(0, 10);
    const configuredLimit = Number(this.config.get<string>('AI_MPESA_DAILY_LIMIT', '20'));
    const limit =
      Number.isSafeInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 20;

    let reservation: Array<{ id: string }>;
    try {
      reservation = await this.prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "ai_usage_daily" (
          "id", "user_id", "usage_date", "feature",
          "request_count", "input_tokens", "output_tokens",
          "created_at", "updated_at"
        )
        VALUES (
          ${randomUUID()}::uuid, ${userId}::uuid, ${dateKey}::date, ${this.feature},
          1, 0, 0, NOW(), NOW()
        )
        ON CONFLICT ("user_id", "usage_date", "feature")
        DO UPDATE SET
          "request_count" = "ai_usage_daily"."request_count" + 1,
          "updated_at" = NOW()
        WHERE "ai_usage_daily"."request_count" < ${limit}
        RETURNING "id"
      `;
    } catch {
      this.logger.error('Could not reserve M-Pesa AI usage capacity.');
      throw new ServiceUnavailableException(
        'M-Pesa parsing is temporarily unavailable. Please try again shortly.',
      );
    }

    if (reservation.length === 0) {
      throw new TooManyRequestsException(
        `You have reached today's M-Pesa parsing limit of ${limit}. Try again tomorrow.`,
      );
    }

    return usageDate;
  }

  async recordMpesaParse(
    userId: string,
    usageDate: Date,
    usage: AiUsageRecord,
  ): Promise<void> {
    const inputTokens = this.safeTokenCount(usage.inputTokens);
    const outputTokens = this.safeTokenCount(usage.outputTokens);
    const inputRate = this.optionalRate('AI_INPUT_COST_PER_MILLION_USD');
    const outputRate = this.optionalRate('AI_OUTPUT_COST_PER_MILLION_USD');
    const estimatedCostUsd =
      inputRate === null || outputRate === null
        ? null
        : (
            (inputTokens * inputRate + outputTokens * outputRate) /
            1_000_000
          ).toFixed(8);

    await this.prisma.$transaction(async (tx) => {
      await tx.aiUsageDaily.update({
        where: {
          userId_usageDate_feature: {
            userId,
            usageDate,
            feature: this.feature,
          },
        },
        data: {
          inputTokens: { increment: inputTokens },
          outputTokens: { increment: outputTokens },
        },
      });

      await tx.aiUsageEvent.create({
        data: {
          id: randomUUID(),
          userId,
          feature: this.feature,
          provider: usage.provider.slice(0, 32),
          model: usage.model.slice(0, 128),
          inputTokens,
          outputTokens,
          estimatedCostUsd,
        },
      });
    });
  }

  private safeTokenCount(value: number): number {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  private optionalRate(key: string): number | null {
    const value = this.config.get<string>(key);
    if (value === undefined || value.trim() === '') return null;
    const rate = Number(value);
    return Number.isFinite(rate) && rate >= 0 ? rate : null;
  }
}
