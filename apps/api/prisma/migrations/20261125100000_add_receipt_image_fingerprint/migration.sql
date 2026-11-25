ALTER TABLE "transactions"
ADD COLUMN "receipt_image_hash" CHAR(64);

CREATE UNIQUE INDEX "transactions_user_id_receipt_image_hash_key"
ON "transactions" ("user_id", "receipt_image_hash");
