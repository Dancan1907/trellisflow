// ============================================================================
// PrismaService
// ============================================================================
// Wraps PrismaClient in a NestJS service, connecting on app startup and
// disconnecting on shutdown.
//
// Every other service in the app injects PrismaService to talk to the
// database. Tenancy enforcement (auto user_id scoping) is applied
// via a Prisma client extension using the ClsService context.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { tenantExtension } from './tenant.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly cls: ClsService) {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    // Apply the extension to this instance
    const extended = this.$extends(tenantExtension(this.cls));
    // Copy the extended methods back onto `this`
    Object.assign(this, extended);
  }

  /**
   * Connects to the database when the module is initialized.
   * Retries once after 3 seconds if the first attempt fails (e.g. Neon cold start).
   */
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Connected to database');
    } catch (error) {
      console.log('⚠️ Database connection failed, retrying in 3 seconds...');
      // Wait 3 seconds and try again (Neon sleep wake-up)
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await this.$connect();
      console.log('✅ Connected to database on second attempt');
    }
  }

  /**
   * Disconnects from the database when the module is destroyed.
   * Ensures clean shutdown.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
