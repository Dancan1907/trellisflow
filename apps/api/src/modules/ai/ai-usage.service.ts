import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface AiUsageRecord {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  succeeded: boolean;
}

type AiUsageFeature = 'MPESA_IMPORT' | 'NATURAL_LANGUAGE_DRAFT' | 'MONEY_COPILOT';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * M-Pesa compatibility wrapper.
   * Existing M-Pesa callers do not need to change.
   */
  async reserveMpesaParse(userId: string): Promise<Date> {
    return this.reserveFeature(
      userId,
      'MPESA_IMPORT',
      'AI_MPESA_DAILY_LIMIT',
      'M-Pesa parsing',
    );
  }

  /**
   * Reserves capacity for a natural-language transaction draft.
   */
  async reserveNaturalLanguageDraft(userId: string): Promise<Date> {
    return this.reserveFeature(
      userId,
      'NATURAL_LANGUAGE_DRAFT',
      'AI_NL_DRAFT_DAILY_LIMIT',
      'Natural-language transaction drafting',
    );
  }

  /** Reserves an independent daily allowance for read-only Money Copilot. */
  async reserveMoneyCopilot(userId: string): Promise<Date> {
    return this.reserveFeature(
      userId,
      'MONEY_COPILOT',
      'AI_MONEY_COPILOT_DAILY_LIMIT',
      'Money Copilot',
    );
  }

  /**
   * Shared atomic daily-capacity reservation.
   *
   * Each feature has its own daily counter, even though all features
   * share the same database table.
   */
  private async reserveFeature(
    userId: string,
    feature: AiUsageFeature,
    limitConfigKey: string,
    featureLabel: string,
  ): Promise<Date> {
    const now = new Date();
    const usageDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dateKey = usageDate.toISOString().slice(0, 10);

    const configuredLimit = Number(
      this.config.get<string>(limitConfigKey, '20'),
    );

    const limit =
      Number.isSafeInteger(configuredLimit) && configuredLimit > 0
        ? configuredLimit
        : 20;

    let reservation: Array<{ id: string }>;

    try {
      reservation = await this.prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "ai_usage_daily" (
          "id", "user_id", "usage_date", "feature",
          "request_count", "input_tokens", "output_tokens",
          "created_at", "updated_at"
        )
        VALUES (
          ${randomUUID()}::uuid, ${userId}::uuid, ${dateKey}::date, ${feature},
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
      this.logger.error(
        `Could not reserve ${featureLabel} AI usage capacity.`,
      );

      throw new ServiceUnavailableException(
        `${featureLabel} is temporarily unavailable. Please try again shortly.`,
      );
    }

    if (reservation.length === 0) {
      throw new HttpException(
        `You have reached today's ${featureLabel} limit of ${limit}. Try again tomorrow.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return usageDate;
  }

  /**
   * M-Pesa compatibility wrapper.
   * Existing M-Pesa accounting callers do not need to change.
   */
  async recordMpesaParse(
    userId: string,
    usageDate: Date,
    usage: AiUsageRecord,
  ): Promise<void> {
    return this.recordFeatureUsage(
      userId,
      usageDate,
      'MPESA_IMPORT',
      usage,
    );
  }

  /**
   * Records usage for a natural-language transaction draft.
   */
  async recordNaturalLanguageDraft(
    userId: string,
    usageDate: Date,
    usage: AiUsageRecord,
  ): Promise<void> {
    return this.recordFeatureUsage(
      userId,
      usageDate,
      'NATURAL_LANGUAGE_DRAFT',
      usage,
    );
  }

  /** Records privacy-safe token metadata for Money Copilot. */
  async recordMoneyCopilot(
    userId: string,
    usageDate: Date,
    usage: AiUsageRecord,
  ): Promise<void> {
    return this.recordFeatureUsage(userId, usageDate, 'MONEY_COPILOT', usage);
  }

  /**
   * Shared privacy-safe usage recording.
   *
   * Stores operational metadata only. Never store prompts, original
   * messages, account details, or extracted transaction information.
   */
  private async recordFeatureUsage(
    userId: string,
    usageDate: Date,
    feature: AiUsageFeature,
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
            feature,
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
          feature,
          provider: usage.provider.slice(0, 32),
          model: usage.model.slice(0, 128),
          inputTokens,
          outputTokens,
          succeeded: usage.succeeded,
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

    if (value === undefined || value.trim() === '') {
      return null;
    }

    const rate = Number(value);

    return Number.isFinite(rate) && rate >= 0 ? rate : null;
  }
}
