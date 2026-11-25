ALTER TABLE "transactions"
ADD COLUMN "mpesa_reference" VARCHAR(32);

CREATE UNIQUE INDEX "transactions_user_id_mpesa_reference_key"
ON "transactions" ("user_id", "mpesa_reference");
