-- CreateEnum
CREATE TYPE "EntryOrigin" AS ENUM ('WHATSAPP', 'PLANILHA', 'FORM');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO');

-- AlterTable: make message_id optional
ALTER TABLE "entries" ALTER COLUMN "message_id" DROP NOT NULL;

-- AlterTable: add new columns
ALTER TABLE "entries" ADD COLUMN "origin" "EntryOrigin" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "entries" ADD COLUMN "categoria" TEXT;
ALTER TABLE "entries" ADD COLUMN "data_vencimento" TIMESTAMP(3);
ALTER TABLE "entries" ADD COLUMN "data_pagamento" TIMESTAMP(3);
ALTER TABLE "entries" ADD COLUMN "entry_status" "EntryStatus" NOT NULL DEFAULT 'PENDENTE';

-- CreateIndex
CREATE INDEX "entries_origin_idx" ON "entries"("origin");
CREATE INDEX "entries_entry_status_idx" ON "entries"("entry_status");
