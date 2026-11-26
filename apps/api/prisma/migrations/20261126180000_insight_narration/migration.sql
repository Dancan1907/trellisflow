-- Add asynchronous AI narration state without changing deterministic insight fields.
CREATE TYPE "InsightNarrationStatus" AS ENUM ('NOT_REQUESTED', 'PROCESSING', 'READY', 'FAILED');

ALTER TABLE "insights"
  ADD COLUMN "narrative" VARCHAR(1600),
  ADD COLUMN "narration_status" "InsightNarrationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "narrated_at" TIMESTAMPTZ(6);

CREATE INDEX "insights_narration_queue_idx"
  ON "insights" ("narration_status", "created_at")
  WHERE "status" = 'ACTIVE';
