-- Privacy-safe AI usage accounting. No prompts, SMS content, receipt bytes,
-- or extracted transaction details are stored in these tables.
CREATE TABLE "ai_usage_daily" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "usage_date" DATE NOT NULL,
    "feature" VARCHAR(64) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_usage_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "feature" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "model" VARCHAR(128) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(14,8),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_usage_daily_user_id_usage_date_feature_key"
ON "ai_usage_daily"("user_id", "usage_date", "feature");

CREATE INDEX "ai_usage_daily_usage_date_feature_idx"
ON "ai_usage_daily"("usage_date", "feature");

CREATE INDEX "ai_usage_events_user_id_created_at_idx"
ON "ai_usage_events"("user_id", "created_at" DESC);

CREATE INDEX "ai_usage_events_feature_created_at_idx"
ON "ai_usage_events"("feature", "created_at" DESC);

ALTER TABLE "ai_usage_daily"
ADD CONSTRAINT "ai_usage_daily_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage_events"
ADD CONSTRAINT "ai_usage_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
