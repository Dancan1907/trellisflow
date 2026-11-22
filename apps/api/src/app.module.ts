/**
 * Root application module.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContainersModule } from './modules/containers/containers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { AuditModule } from './modules/audit/audit.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';
import { SnapshotsModule } from './modules/snapshots/snapshots.module';
import { InsightsModule } from './modules/insights/insights.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';
import { HealthController } from './health.controller';

import { HoldingsModule } from './modules/holdings/holdings.module';
import { InvestmentEventsModule } from './modules/investment-events/investment-events.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { SummariesModule } from './modules/summaries/summaries.module';
import { ApiTokensModule } from './modules/api-tokens/api-tokens.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { apiIpThrottler } from './modules/api-tokens/api-token-throttle';
import { DebtsModule } from './modules/debts/debts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ContainersModule,
    UsersModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
      // Per-IP backstop for the public API (the per-token limit lives on ExternalApiController)
      apiIpThrottler,
    ]),
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
    AuditModule,
    RecurringModule,
    BudgetsModule,
    GoalsModule,
    SnapshotsModule,
    InsightsModule,
    DashboardModule,
    HoldingsModule,
    InvestmentEventsModule,
    BusinessesModule,
    SummariesModule,
    ApiTokensModule,
    ExternalApiModule,
    DebtsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
