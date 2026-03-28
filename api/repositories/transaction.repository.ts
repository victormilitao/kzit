import { Prisma, Transaction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { EntryFilters, SummaryResult } from '../types';

export const transactionRepository = {
  async findAll(filters: EntryFilters): Promise<{ data: Transaction[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.responsavel) where.responsavel = { contains: filters.responsavel, mode: 'insensitive' };
    if (filters.origin) where.origin = filters.origin;
    if (filters.uploadId) where.message = { uploadId: filters.uploadId };
    if (filters.needsReview !== undefined) {
      if (filters.needsReview) {
        where.entries = { some: { needsReview: true } };
      } else {
        where.entries = { none: { needsReview: true } };
      }
    }

    if (filters.startDate || filters.endDate) {
      where.dataLancamento = {};
      if (filters.startDate) where.dataLancamento.gte = filters.startDate;
      if (filters.endDate) where.dataLancamento.lte = filters.endDate;
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataLancamento: 'desc' },
        include: { 
          message: { select: { text: true, senderName: true, timestamp: true } },
          entries: { orderBy: { numeroParcela: 'asc' } }
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { data, total };
  },

  async getSummary(uploadId?: string, startDate?: Date, endDate?: Date): Promise<SummaryResult> {
    const where: Prisma.TransactionWhereInput = {
      tipo: { not: 'DESCONHECIDO' },
    };

    if (uploadId) where.message = { uploadId };

    if (startDate || endDate) {
      where.dataLancamento = {};
      if (startDate) where.dataLancamento.gte = startDate;
      if (endDate) where.dataLancamento.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: { tipo: true, valorTotal: true, confianca: true, entries: { select: { needsReview: true } } },
    });

    let totalVendas = 0;
    let totalDespesas = 0;
    let totalCompras = 0;
    let totalReceitas = 0;
    let totalEstornos = 0;
    let saldoAnterior = 0;
    let pendentesRevisao = 0;
    let totalLancamentos = 0;

    for (const trx of transactions) {
      for (const entry of trx.entries) {
        if (entry.needsReview) pendentesRevisao++;
      }
      totalLancamentos++;

      if (trx.confianca < 0.8) continue;

      const valor = trx.valorTotal ? Number(trx.valorTotal) : 0;
      switch (trx.tipo) {
        case 'VENDA': totalVendas += valor; break;
        case 'DESPESA': totalDespesas += valor; break;
        case 'COMPRA': totalCompras += valor; break;
        case 'RECEITA': totalReceitas += valor; break;
        case 'ESTORNO': totalEstornos += valor; break;
        case 'SALDO_ANTERIOR': saldoAnterior += valor; break;
      }
    }

    return {
      totalVendas,
      totalDespesas,
      totalCompras,
      totalReceitas,
      totalEstornos,
      saldoAnterior,
      saldo: saldoAnterior + totalVendas + totalReceitas - totalDespesas - totalCompras - totalEstornos,
      totalLancamentos,
      pendentesRevisao,
    };
  },

  async update(id: string, data: Prisma.TransactionUpdateInput): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<Transaction> {
    // This will cascade and delete all child entries automatically because of the Prisma schema configuration if onDelete: Cascade is set.
    return prisma.transaction.delete({
      where: { id },
    });
  },
};
