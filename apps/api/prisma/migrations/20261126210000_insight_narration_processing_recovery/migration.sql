-- Track when narration processing starts so abandoned jobs can be recovered safely.
ALTER TABLE "insights"
  ADD COLUMN "narration_processing_at" TIMESTAMPTZ(6);

-- Give jobs already marked PROCESSING a fresh recovery window during rollout.
UPDATE "insights"
SET "narration_processing_at" = NOW()
WHERE "narration_status" = 'PROCESSING'
  AND "narration_processing_at" IS NULL;

CREATE INDEX "insights_narration_recovery_idx"
  ON "insights" ("narration_status", "narration_processing_at");
