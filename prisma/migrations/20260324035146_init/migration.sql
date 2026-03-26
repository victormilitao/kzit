-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('VENDA', 'DESPESA', 'RECEITA', 'ESTORNO', 'DESCONHECIDO');

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "total_messages" INTEGER NOT NULL DEFAULT 0,
    "processed_messages" INTEGER NOT NULL DEFAULT 0,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "tipo" "EntryType" NOT NULL,
    "cliente" TEXT,
    "produto" TEXT,
    "descricao" TEXT,
    "valor" DECIMAL(10,2),
    "parcelas" INTEGER,
    "forma_pagamento" TEXT,
    "observacoes" TEXT,
    "confianca" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vendedora" TEXT NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uploads_status_idx" ON "uploads"("status");

-- CreateIndex
CREATE INDEX "uploads_created_at_idx" ON "uploads"("created_at");

-- CreateIndex
CREATE INDEX "messages_upload_id_idx" ON "messages"("upload_id");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_timestamp_idx" ON "messages"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "entries_message_id_key" ON "entries"("message_id");

-- CreateIndex
CREATE INDEX "entries_tipo_idx" ON "entries"("tipo");

-- CreateIndex
CREATE INDEX "entries_needs_review_idx" ON "entries"("needs_review");

-- CreateIndex
CREATE INDEX "entries_created_at_idx" ON "entries"("created_at");

-- CreateIndex
CREATE INDEX "entries_vendedora_idx" ON "entries"("vendedora");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
