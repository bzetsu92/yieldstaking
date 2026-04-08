/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `user_wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_wallets_user_id_is_primary_idx";

-- AlterTable
ALTER TABLE "user_wallets" ALTER COLUMN "is_primary" SET DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_user_id_key" ON "user_wallets"("user_id");
