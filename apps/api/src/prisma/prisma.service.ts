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
   * If the connection fails, the app will not start.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnects from the database when the module is destroyed.
   * Ensures clean shutdown.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
