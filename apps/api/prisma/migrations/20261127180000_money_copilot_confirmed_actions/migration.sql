-- Persist Money Copilot previews and make transaction idempotency atomic.
-- Existing transaction rows currently do not populate idempotency_key; PostgreSQL
-- permits multiple NULL values under this unique constraint.
DROP INDEX IF EXISTS "transactions_user_id_idempotency_key_idx";
CREATE UNIQUE INDEX "transactions_user_id_idempotency_key_key"
  ON "transactions"("user_id", "idempotency_key");

CREATE TYPE "MoneyCopilotActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED');

CREATE TABLE "money_copilot_actions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(36) NOT NULL,
  "payload_hash" CHAR(64) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "MoneyCopilotActionStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "confirmed_at" TIMESTAMPTZ(6),
  "transaction_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "money_copilot_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "money_copilot_actions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "money_copilot_actions_user_id_idempotency_key_key"
  ON "money_copilot_actions"("user_id", "idempotency_key");
CREATE INDEX "money_copilot_actions_user_id_status_expires_at_idx"
  ON "money_copilot_actions"("user_id", "status", "expires_at");
CREATE INDEX "money_copilot_actions_transaction_id_idx"
  ON "money_copilot_actions"("transaction_id");
