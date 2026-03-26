/*
  Warnings:

  - A unique constraint covering the columns `[sender_name,text,timestamp]` on the table `messages` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "EntryType" ADD VALUE 'SALDO_ANTERIOR';

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "review_reason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "messages_sender_name_text_timestamp_key" ON "messages"("sender_name", "text", "timestamp");
