-- Step 1: Add column as NULLABLE first (so we can backfill existing rows)
ALTER TABLE "holdings" ADD COLUMN "account_id" UUID;

-- Step 2: Backfill from the first account in the same container
UPDATE "holdings" h
SET "account_id" = (
  SELECT a."id"
  FROM "accounts" a
  WHERE a."container_id" = h."container_id"
    AND a."user_id" = h."user_id"
    AND a."deleted_at" IS NULL
  LIMIT 1
);

-- Step 3: Fail if any holdings have no linked account
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "holdings" WHERE "account_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete migration: some holdings have no account in their container. Please create accounts or delete orphan holdings first.';
  END IF;
END $$;

-- Step 4: Now make the column NOT NULL
ALTER TABLE "holdings" ALTER COLUMN "account_id" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add index for fast lookups
CREATE INDEX "holdings_user_id_account_id_idx" ON "holdings"("user_id", "account_id");