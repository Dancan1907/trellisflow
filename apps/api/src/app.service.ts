/**
 * Root service.
 *
 * Provides the health check response. Real business logic lives
 * in feature-specific services under src/modules/.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Application start time, captured once at boot. */
  private readonly startedAt = new Date();

  /**
   * Returns a health payload.
   * Used by uptime monitors and load balancers.
   */
  getHealth() {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      startedAt: this.startedAt.toISOString(),
      version: process.env.npm_package_version ?? '0.0.1',
    };
  }
}
