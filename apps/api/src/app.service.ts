// ============================================================================
// AppService
// ============================================================================
// Provides the health check response.
// Verifies that both the API and the database are healthy.

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  /** Application start time, captured once at boot. */
  private readonly startedAt = new Date();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a health payload.
   * Pings the database to confirm connectivity.
   */
  async getHealth() {
    try {
      // Simple query — confirms the database is reachable.
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new InternalServerErrorException('Database unreachable');
    }

    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      startedAt: this.startedAt.toISOString(),
      version: process.env.npm_package_version ?? '0.0.1',
      database: 'connected',
    };
  }
}
