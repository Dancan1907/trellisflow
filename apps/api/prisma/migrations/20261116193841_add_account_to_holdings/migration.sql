/*
  Warnings:

  - Added the required column `account_id` to the `holdings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "holdings" ADD COLUMN     "account_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "holdings_user_id_account_id_idx" ON "holdings"("user_id", "account_id");

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;