// ============================================================================
// PrismaService
// ============================================================================
// Wraps PrismaClient in a NestJS service, connecting on app startup and
// disconnecting on shutdown.
//
// Every other service in the app injects PrismaService to talk to the
// database. Tenancy enforcement (auto user_id scoping) will be added
// as a Prisma client extension in a later task, after the Auth module
// exists to provide the "current user" context.

import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
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

  /**
   * Gracefully shuts down the app on SIGTERM/SIGINT.
   * Call this from `main.ts`.
   */
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
