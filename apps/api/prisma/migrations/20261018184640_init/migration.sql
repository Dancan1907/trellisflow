-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "PersonaHint" AS ENUM ('EMPLOYEE', 'INVESTOR', 'BUSINESS_OWNER', 'MULTI_BUSINESS_OWNER');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('PERSONAL', 'INVESTMENT', 'INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RETAIL', 'SERVICE', 'FARMING', 'FREELANCE', 'MANUFACTURING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExternalSourceType" AS ENUM ('MANUAL', 'API');

-- CreateEnum
CREATE TYPE "ExternalSyncInterval" AS ENUM ('DAILY', 'WEEKLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('ASSET', 'LIABILITY');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'MOBILE_MONEY', 'PREPAID_CARD', 'INVESTMENT_ACCOUNT', 'CREDIT_CARD', 'PERSONAL_LOAN', 'MORTGAGE', 'OVERDRAFT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'RECURRING', 'IMPORTED', 'SYNCED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'POSTED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('STOCK', 'ETF', 'BOND', 'CRYPTO', 'REAL_ESTATE', 'RETIREMENT_ACCOUNT', 'VENTURE', 'COMMODITY', 'COLLECTIBLE', 'OTHER');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "HoldingStatus" AS ENUM ('OPEN', 'CLOSED', 'DELETED');

-- CreateEnum
CREATE TYPE "InvestmentEventType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'CONTRIBUTION', 'WITHDRAWAL', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "SummaryPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SummarySource" AS ENUM ('MANUAL', 'API');

-- CreateEnum
CREATE TYPE "ApiTokenStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BudgetMethod" AS ENUM ('TARGET', 'ENVELOPE');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'PAUSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "DebtMethod" AS ENUM ('SNOWBALL', 'AVALANCHE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('STALE_SUMMARY', 'TOKEN_EXPIRING', 'BUDGET_OVERSPENT', 'BUDGET_NEAR_LIMIT', 'GOAL_ACHIEVED', 'GOAL_BEHIND', 'NET_WORTH_MILESTONE', 'UNUSUAL_SPENDING', 'DEBT_COMPLETED', 'OPTIMIZATION_OPPORTUNITY', 'REBALANCE_SUGGESTED', 'PROFIT_DECLINE', 'RUNWAY_LOW');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'OPPORTUNITY', 'WARNING');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('ACTIVE', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'EXTERNAL_API');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE', 'UNARCHIVE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "reporting_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "tier" "UserTier" NOT NULL DEFAULT 'FREE',
    "persona_hint" "PersonaHint",
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ContainerType" NOT NULL,
    "name" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "business_type" "BusinessType" NOT NULL,
    "business_type_custom" TEXT,
    "start_date" DATE,
    "notes" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_business_sources" (
    "id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "source_type" "ExternalSourceType" NOT NULL DEFAULT 'MANUAL',
    "last_synced_at" TIMESTAMPTZ(6),
    "last_summary_date" DATE,
    "last_summary_at" TIMESTAMPTZ(6),
    "sync_interval" "ExternalSyncInterval",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "external_business_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContainerStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AccountCategory" NOT NULL,
    "account_type" "AccountType" NOT NULL DEFAULT 'CUSTOM',
    "currency" VARCHAR(3) NOT NULL,
    "current_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "institution" TEXT,
    "notes" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "category_id" UUID,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "transfer_pair_id" UUID,
    "recurring_rule_id" UUID,
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "idempotency_key" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_rules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "category_id" UUID,
    "transfer_to_account_id" UUID,
    "description" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "day_of_week" INTEGER,
    "day_of_month" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "next_occurrence" DATE NOT NULL,
    "last_generated_at" DATE,
    "status" "RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "asset_class" "AssetClass" NOT NULL,
    "symbol" TEXT,
    "quantity" DECIMAL(24,8) NOT NULL,
    "cost_basis_total" DECIMAL(19,4) NOT NULL,
    "current_value_total" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "acquired_date" DATE,
    "pricing_mode" "PricingMode" NOT NULL DEFAULT 'MANUAL',
    "price_provider" TEXT,
    "provider_symbol" TEXT,
    "last_priced_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "status" "HoldingStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "holding_id" UUID,
    "event_type" "InvestmentEventType" NOT NULL,
    "quantity" DECIMAL(24,8),
    "price_per_unit" DECIMAL(19,4),
    "total_amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "realized_gain" DECIMAL(19,4),
    "related_transaction_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "investment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "unit" TEXT,
    "date" DATE NOT NULL,
    "period" "SummaryPeriod" NOT NULL DEFAULT 'DAY',
    "period_start" DATE,
    "period_end" DATE,
    "income" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "transfers_in" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "transfers_out" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cash_balance" DECIMAL(19,4) NOT NULL,
    "assets_value" DECIMAL(19,4) NOT NULL,
    "liabilities_value" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "notes" TEXT,
    "source" "SummarySource" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summary_versions" (
    "id" UUID NOT NULL,
    "summary_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "edited_by" UUID NOT NULL,
    "edited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "summary_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "last_used_ip" TEXT,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_reason" TEXT,
    "status" "ApiTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "period_start" DATE,
    "period_end" DATE,
    "rollover" BOOLEAN NOT NULL DEFAULT false,
    "rollover_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "method" "BudgetMethod" NOT NULL DEFAULT 'TARGET',
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "container_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "target_date" DATE,
    "linked_account_id" UUID,
    "manual_saved_amount" DECIMAL(19,4),
    "icon" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "achieved_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payoff_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "method" "DebtMethod" NOT NULL DEFAULT 'SNOWBALL',
    "extra_monthly_payment" DECIMAL(19,4) NOT NULL,
    "minimum_payment" DECIMAL(19,4) NOT NULL,
    "interest_rate" DECIMAL(9,6) NOT NULL,
    "projected_payoff_date" DATE,
    "projected_interest_paid" DECIMAL(19,4),
    "notes" TEXT,
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "completed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "debt_payoff_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_net_worth" DECIMAL(19,4) NOT NULL,
    "personal_net_worth" DECIMAL(19,4) NOT NULL,
    "investments_net_worth" DECIMAL(19,4) NOT NULL,
    "businesses_net_worth" DECIMAL(19,4) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_container_id" UUID,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "action_url" TEXT,
    "metadata" JSONB,
    "status" "InsightStatus" NOT NULL DEFAULT 'ACTIVE',
    "dismissed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "changed_fields" TEXT[],
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "job_name" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "status" "JobStatus" NOT NULL DEFAULT 'RUNNING',
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "containers_user_id_status_idx" ON "containers"("user_id", "status");

-- CreateIndex
CREATE INDEX "containers_user_id_type_idx" ON "containers"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_container_id_key" ON "business_profiles"("container_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_business_sources_container_id_key" ON "external_business_sources"("container_id");

-- CreateIndex
CREATE INDEX "external_business_sources_last_summary_at_idx" ON "external_business_sources"("last_summary_at");

-- CreateIndex
CREATE INDEX "categories_user_id_type_status_idx" ON "categories"("user_id", "type", "status");

-- CreateIndex
CREATE INDEX "categories_user_id_container_id_idx" ON "categories"("user_id", "container_id");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_status_idx" ON "accounts"("user_id", "status");

-- CreateIndex
CREATE INDEX "accounts_container_id_status_idx" ON "accounts"("container_id", "status");

-- CreateIndex
CREATE INDEX "accounts_user_id_category_idx" ON "accounts"("user_id", "category");

-- CreateIndex
CREATE INDEX "transactions_user_id_date_idx" ON "transactions"("user_id", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_account_id_date_idx" ON "transactions"("account_id", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_container_id_date_idx" ON "transactions"("container_id", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_category_id_date_idx" ON "transactions"("category_id", "date");

-- CreateIndex
CREATE INDEX "transactions_transfer_pair_id_idx" ON "transactions"("transfer_pair_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idempotency_key_idx" ON "transactions"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "recurring_rules_user_id_status_idx" ON "recurring_rules"("user_id", "status");

-- CreateIndex
CREATE INDEX "recurring_rules_next_occurrence_idx" ON "recurring_rules"("next_occurrence");

-- CreateIndex
CREATE INDEX "recurring_rules_account_id_idx" ON "recurring_rules"("account_id");

-- CreateIndex
CREATE INDEX "holdings_user_id_status_idx" ON "holdings"("user_id", "status");

-- CreateIndex
CREATE INDEX "holdings_container_id_status_idx" ON "holdings"("container_id", "status");

-- CreateIndex
CREATE INDEX "holdings_user_id_asset_class_idx" ON "holdings"("user_id", "asset_class");

-- CreateIndex
CREATE INDEX "holdings_pricing_mode_last_priced_at_idx" ON "holdings"("pricing_mode", "last_priced_at");

-- CreateIndex
CREATE INDEX "investment_events_holding_id_date_idx" ON "investment_events"("holding_id", "date" DESC);

-- CreateIndex
CREATE INDEX "investment_events_user_id_date_idx" ON "investment_events"("user_id", "date" DESC);

-- CreateIndex
CREATE INDEX "investment_events_container_id_date_idx" ON "investment_events"("container_id", "date" DESC);

-- CreateIndex
CREATE INDEX "investment_events_related_transaction_id_idx" ON "investment_events"("related_transaction_id");

-- CreateIndex
CREATE INDEX "summaries_container_id_date_idx" ON "summaries"("container_id", "date" DESC);

-- CreateIndex
CREATE INDEX "summaries_user_id_date_idx" ON "summaries"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "summaries_container_id_date_unit_key" ON "summaries"("container_id", "date", "unit");

-- CreateIndex
CREATE INDEX "summary_versions_summary_id_idx" ON "summary_versions"("summary_id");

-- CreateIndex
CREATE UNIQUE INDEX "summary_versions_summary_id_version_number_key" ON "summary_versions"("summary_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_hash_key" ON "api_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "api_tokens_container_id_status_idx" ON "api_tokens"("container_id", "status");

-- CreateIndex
CREATE INDEX "api_tokens_expires_at_idx" ON "api_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens"("user_id");

-- CreateIndex
CREATE INDEX "budgets_user_id_container_id_status_idx" ON "budgets"("user_id", "container_id", "status");

-- CreateIndex
CREATE INDEX "budgets_user_id_period_idx" ON "budgets"("user_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_container_id_category_id_status_key" ON "budgets"("container_id", "category_id", "status");

-- CreateIndex
CREATE INDEX "savings_goals_user_id_status_idx" ON "savings_goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "savings_goals_container_id_status_idx" ON "savings_goals"("container_id", "status");

-- CreateIndex
CREATE INDEX "savings_goals_linked_account_id_idx" ON "savings_goals"("linked_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "debt_payoff_plans_account_id_key" ON "debt_payoff_plans"("account_id");

-- CreateIndex
CREATE INDEX "debt_payoff_plans_user_id_status_idx" ON "debt_payoff_plans"("user_id", "status");

-- CreateIndex
CREATE INDEX "net_worth_snapshots_user_id_date_idx" ON "net_worth_snapshots"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_snapshots_user_id_date_key" ON "net_worth_snapshots"("user_id", "date");

-- CreateIndex
CREATE INDEX "insights_user_id_status_created_at_idx" ON "insights"("user_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "insights_user_id_type_idx" ON "insights"("user_id", "type");

-- CreateIndex
CREATE INDEX "insights_expires_at_idx" ON "insights"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_entity_type_action_idx" ON "audit_logs"("user_id", "entity_type", "action");

-- CreateIndex
CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at" DESC);

-- CreateIndex
CREATE INDEX "job_runs_status_idx" ON "job_runs"("status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_business_sources" ADD CONSTRAINT "external_business_sources_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_id_fkey" FOREIGN KEY ("recurring_rule_id") REFERENCES "recurring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_events" ADD CONSTRAINT "investment_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_events" ADD CONSTRAINT "investment_events_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_events" ADD CONSTRAINT "investment_events_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_versions" ADD CONSTRAINT "summary_versions_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_versions" ADD CONSTRAINT "summary_versions_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payoff_plans" ADD CONSTRAINT "debt_payoff_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payoff_plans" ADD CONSTRAINT "debt_payoff_plans_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
