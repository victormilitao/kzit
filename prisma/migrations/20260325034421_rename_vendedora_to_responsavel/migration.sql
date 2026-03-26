-- RenameColumn
ALTER TABLE "entries" RENAME COLUMN "vendedora" TO "responsavel";

-- RenameIndex
DROP INDEX "entries_vendedora_idx";
CREATE INDEX "entries_responsavel_idx" ON "entries"("responsavel");
