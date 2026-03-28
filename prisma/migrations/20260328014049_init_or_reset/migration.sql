/*
  Warnings:

  - You are about to drop the column `categoria` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `cliente` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `confianca` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `descricao` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `forma_pagamento` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `message_id` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `observacoes` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `parcelas` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `produto` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `responsavel` on the `entries` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `entries` table. All the data in the column will be lost.
  - Added the required column `transaction_id` to the `entries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "entries" DROP CONSTRAINT "entries_message_id_fkey";

-- DropIndex
DROP INDEX "entries_created_at_idx";

-- DropIndex
DROP INDEX "entries_message_id_key";

-- DropIndex
DROP INDEX "entries_origin_idx";

-- DropIndex
DROP INDEX "entries_responsavel_idx";

-- DropIndex
DROP INDEX "entries_tipo_idx";

-- AlterTable
ALTER TABLE "entries" DROP COLUMN "categoria",
DROP COLUMN "cliente",
DROP COLUMN "confianca",
DROP COLUMN "descricao",
DROP COLUMN "forma_pagamento",
DROP COLUMN "message_id",
DROP COLUMN "observacoes",
DROP COLUMN "origin",
DROP COLUMN "parcelas",
DROP COLUMN "produto",
DROP COLUMN "responsavel",
DROP COLUMN "tipo",
ADD COLUMN     "numero_parcela" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "transaction_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT,
    "tipo" "EntryType" NOT NULL,
    "origin" "EntryOrigin" NOT NULL DEFAULT 'WHATSAPP',
    "categoria" TEXT,
    "cliente" TEXT,
    "produto" TEXT,
    "descricao" TEXT,
    "valor_total" DECIMAL(10,2),
    "parcelas" INTEGER,
    "forma_pagamento" TEXT,
    "observacoes" TEXT,
    "confianca" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responsavel" TEXT NOT NULL,
    "data_lancamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_message_id_key" ON "transactions"("message_id");

-- CreateIndex
CREATE INDEX "transactions_tipo_idx" ON "transactions"("tipo");

-- CreateIndex
CREATE INDEX "transactions_origin_idx" ON "transactions"("origin");

-- CreateIndex
CREATE INDEX "transactions_data_lancamento_idx" ON "transactions"("data_lancamento");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "transactions_responsavel_idx" ON "transactions"("responsavel");

-- CreateIndex
CREATE INDEX "entries_transaction_id_idx" ON "entries"("transaction_id");

-- CreateIndex
CREATE INDEX "entries_data_vencimento_idx" ON "entries"("data_vencimento");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
