-- Preserve whether a metered provider request returned successfully.
ALTER TABLE "ai_usage_events"
ADD COLUMN "succeeded" BOOLEAN NOT NULL DEFAULT TRUE;
