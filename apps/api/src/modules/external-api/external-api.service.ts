import { Injectable, ConflictException } from '@nestjs/common';
import { SummariesService } from '../summaries/summaries.service';
import { CreateSummaryDto } from '../summaries/dto/create-summary.dto';
import { BulkCreateSummaryDto } from './dto/bulk-create-summary.dto';

@Injectable()
export class ExternalApiService {
  constructor(private readonly summariesService: SummariesService) {}

  async getBusiness(container: any) {
    return {
      id: container.id,
      name: container.name,
      currency: container.currency,
      type: container.type,
      createdAt: container.createdAt,
    };
  }

  async getLatestSummary(userId: string, containerId: string) {
    return this.summariesService.findLatest(userId, containerId);
  }

  async createSummary(userId: string, containerId: string, dto: CreateSummaryDto) {
    try {
      // Reuse the existing Wave 4 logic
      return await this.summariesService.create(userId, containerId, dto);
    } catch (error) {
      // Idempotency: if the exact (date + unit) summary already exists, return it instead of
      // throwing a 409, so retries after a network failure are safe.
      if (error instanceof ConflictException) {
        const match = await this.summariesService.findByDateAndUnit(
          userId,
          containerId,
          dto.date,
          dto.unit,
        );
        if (match) {
          return { ...match, idempotent: true };
        }
      }
      throw error;
    }
  }

  async createBulkSummaries(userId: string, containerId: string, dto: BulkCreateSummaryDto) {
    // Process all summaries in parallel, allowing partial success
    const results = await Promise.allSettled(
      dto.summaries.map((summary) => this.createSummary(userId, containerId, summary)),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return { status: 'success', data: result.value };
      } else {
        return {
          status: 'error',
          message: result.reason?.message || 'Unknown error',
          error: result.reason?.name || 'Error',
        };
      }
    });
  }
}
