import { EntryType, EntryStatus, Prisma } from '@prisma/client';
import { transactionRepository } from '../repositories/transaction.repository';
import { EntryFilters } from '../types';
import { prisma } from '../lib/prisma';

export const transactionService = {
  async listTransactions(filters: {
    tipo?: string;
    vendedora?: string;
    needsReview?: boolean;
    uploadId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const entryFilters: EntryFilters = {
      tipo: filters.tipo as EntryType | undefined,
      responsavel: filters.vendedora,
      needsReview: filters.needsReview,
      uploadId: filters.uploadId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: filters.page || 1,
      limit: filters.limit || 20,
    };
    return transactionRepository.findAll(entryFilters);
  },

  async getSummary(uploadId?: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return transactionRepository.getSummary(uploadId, start, end);
  },

  async updateTransaction(id: string, data: Record<string, unknown>) {
    // Separate Transaction-level fields from Entry-level fields
    const trxFields: Prisma.TransactionUpdateInput = {};
    const entryFields: Prisma.EntryUpdateInput = {};
    let hasTrxUpdate = false;
    let hasEntryUpdate = false;

    // Transaction-level fields
    if (data.tipo !== undefined) { trxFields.tipo = data.tipo as EntryType; hasTrxUpdate = true; }
    if (data.cliente !== undefined) { trxFields.cliente = data.cliente as string | null; hasTrxUpdate = true; }
    if (data.produto !== undefined) { trxFields.produto = data.produto as string | null; hasTrxUpdate = true; }
    if (data.descricao !== undefined) { trxFields.descricao = data.descricao as string | null; hasTrxUpdate = true; }
    if (data.categoria !== undefined) { trxFields.categoria = data.categoria as string | null; hasTrxUpdate = true; }
    if (data.parcelas !== undefined) { trxFields.parcelas = data.parcelas as number | null; hasTrxUpdate = true; }
    if (data.formaPagamento !== undefined) { trxFields.formaPagamento = data.formaPagamento as string | null; hasTrxUpdate = true; }
    if (data.observacoes !== undefined) { trxFields.observacoes = data.observacoes as string | null; hasTrxUpdate = true; }
    if (data.valor !== undefined) {
      const valorNum = data.valor != null ? Number(data.valor) : null;
      trxFields.valorTotal = valorNum != null ? new Prisma.Decimal(valorNum) : null;
      hasTrxUpdate = true;
    }

    // Entry-level fields (apply to all child entries)
    if (data.needsReview !== undefined) {
      entryFields.needsReview = data.needsReview as boolean;
      hasEntryUpdate = true;
      if (data.needsReview === false) {
        trxFields.confianca = 1.0;
        hasTrxUpdate = true;
      }
    }
    if (data.reviewReason !== undefined) { entryFields.reviewReason = data.reviewReason as string | null; hasEntryUpdate = true; }
    if (data.entryStatus !== undefined) { entryFields.entryStatus = data.entryStatus as EntryStatus; hasEntryUpdate = true; }
    if (data.dataVencimento !== undefined) {
      const dv = data.dataVencimento as string | null;
      entryFields.dataVencimento = dv ? new Date(dv.includes('T') ? dv : dv + 'T12:00:00Z') : null;
      hasEntryUpdate = true;
    }
    if (data.dataPagamento !== undefined) {
      const dp = data.dataPagamento as string | null;
      entryFields.dataPagamento = dp ? new Date(dp.includes('T') ? dp : dp + 'T12:00:00Z') : null;
      hasEntryUpdate = true;
    }

    // Update Transaction fields
    if (hasTrxUpdate) {
      await prisma.transaction.update({
        where: { id },
        data: trxFields,
      });
    }

    // Update all child Entries
    if (hasEntryUpdate) {
      await prisma.entry.updateMany({
        where: { transactionId: id },
        data: entryFields,
      });
    }

    // Return the updated transaction with entries
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        message: { select: { text: true, senderName: true, timestamp: true } },
        entries: { orderBy: { numeroParcela: 'asc' } },
      },
    });
  },

  async deleteTransaction(id: string) {
    return transactionRepository.delete(id);
  },
};
