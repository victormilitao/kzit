import { Prisma, Entry, EntryType, EntryOrigin, EntryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { EntryFilters, SummaryResult, CreateEntryInput } from '../types';

export const entryRepository = {
  async create(data: {
    messageId: string;
    tipo: EntryType;
    cliente?: string | null;
    produto?: string | null;
    descricao?: string | null;
    valor?: number | null;
    parcelas?: number | null;
    formaPagamento?: string | null;
    observacoes?: string | null;
    confianca: number;
    responsavel: string;
    needsReview: boolean;
    reviewReason?: string | null;
  }): Promise<Entry> {
    return prisma.entry.create({
      data: {
        messageId: data.messageId,
        tipo: data.tipo,
        origin: 'WHATSAPP',
        cliente: data.cliente,
        produto: data.produto,
        descricao: data.descricao,
        valor: data.valor != null ? new Prisma.Decimal(data.valor) : null,
        parcelas: data.parcelas,
        formaPagamento: data.formaPagamento,
        observacoes: data.observacoes,
        confianca: data.confianca,
        responsavel: data.responsavel,
        needsReview: data.needsReview,
        reviewReason: data.reviewReason,
      },
    });
  },

  async createManual(data: CreateEntryInput): Promise<Entry> {
    return prisma.entry.create({
      data: {
        tipo: data.tipo,
        origin: data.origin,
        descricao: data.descricao,
        categoria: data.categoria,
        cliente: data.cliente,
        produto: data.produto,
        valor: data.valor != null ? new Prisma.Decimal(data.valor) : null,
        parcelas: data.parcelas,
        formaPagamento: data.formaPagamento,
        observacoes: data.observacoes,
        confianca: 1.0,
        responsavel: data.responsavel,
        needsReview: false,
        dataVencimento: data.dataVencimento,
        dataPagamento: data.dataPagamento,
        entryStatus: data.entryStatus || 'PENDENTE',
      },
    });
  },

  async createBatch(entries: CreateEntryInput[]): Promise<number> {
    const result = await prisma.entry.createMany({
      data: entries.map((data) => ({
        tipo: data.tipo,
        origin: data.origin,
        descricao: data.descricao,
        categoria: data.categoria,
        cliente: data.cliente,
        produto: data.produto,
        valor: data.valor != null ? new Prisma.Decimal(data.valor) : null,
        parcelas: data.parcelas,
        formaPagamento: data.formaPagamento,
        observacoes: data.observacoes,
        confianca: 1.0,
        responsavel: data.responsavel,
        needsReview: false,
        dataVencimento: data.dataVencimento,
        dataPagamento: data.dataPagamento,
        entryStatus: data.entryStatus || 'PENDENTE',
      })),
    });
    return result.count;
  },

  async findAll(filters: EntryFilters): Promise<{ data: Entry[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EntryWhereInput = {};

    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.responsavel) where.responsavel = { contains: filters.responsavel, mode: 'insensitive' };
    if (filters.needsReview !== undefined) where.needsReview = filters.needsReview;
    if (filters.origin) where.origin = filters.origin;
    if (filters.uploadId) where.message = { uploadId: filters.uploadId };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [data, total] = await Promise.all([
      prisma.entry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { message: { select: { text: true, senderName: true, timestamp: true } } },
      }),
      prisma.entry.count({ where }),
    ]);

    return { data, total };
  },

  async getSummary(uploadId?: string, startDate?: Date, endDate?: Date): Promise<SummaryResult> {
    const where: Prisma.EntryWhereInput = {
      tipo: { not: 'DESCONHECIDO' },
    };

    if (uploadId) where.message = { uploadId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const entries = await prisma.entry.findMany({
      where,
      select: { tipo: true, valor: true, needsReview: true, confianca: true },
    });

    let totalVendas = 0;
    let totalDespesas = 0;
    let totalReceitas = 0;
    let totalEstornos = 0;
    let saldoAnterior = 0;
    let pendentesRevisao = 0;

    for (const entry of entries) {
      if (entry.needsReview) pendentesRevisao++;

      // Entries with low confidence don't affect financials
      if (entry.confianca < 0.8) continue;

      const valor = entry.valor ? Number(entry.valor) : 0;
      switch (entry.tipo) {
        case 'VENDA': totalVendas += valor; break;
        case 'DESPESA': totalDespesas += valor; break;
        case 'RECEITA': totalReceitas += valor; break;
        case 'ESTORNO': totalEstornos += valor; break;
        case 'SALDO_ANTERIOR': saldoAnterior += valor; break;
      }
    }

    return {
      totalVendas,
      totalDespesas,
      totalReceitas,
      totalEstornos,
      saldoAnterior,
      saldo: saldoAnterior + totalVendas + totalReceitas - totalDespesas - totalEstornos,
      totalLancamentos: entries.length,
      pendentesRevisao,
    };
  },

  async update(
    id: string,
    data: {
      tipo?: EntryType;
      cliente?: string | null;
      produto?: string | null;
      descricao?: string | null;
      categoria?: string | null;
      valor?: number | null;
      parcelas?: number | null;
      formaPagamento?: string | null;
      observacoes?: string | null;
      needsReview?: boolean;
      reviewReason?: string | null;
      dataVencimento?: Date | null;
      dataPagamento?: Date | null;
      entryStatus?: EntryStatus;
    }
  ): Promise<Entry> {
    const updateData: Prisma.EntryUpdateInput = {};

    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.cliente !== undefined) updateData.cliente = data.cliente;
    if (data.produto !== undefined) updateData.produto = data.produto;
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.categoria !== undefined) updateData.categoria = data.categoria;
    if (data.valor !== undefined) {
      updateData.valor = data.valor != null ? new Prisma.Decimal(data.valor) : null;
    }
    if (data.parcelas !== undefined) updateData.parcelas = data.parcelas;
    if (data.formaPagamento !== undefined) updateData.formaPagamento = data.formaPagamento;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
    if (data.needsReview !== undefined) updateData.needsReview = data.needsReview;
    if (data.reviewReason !== undefined) updateData.reviewReason = data.reviewReason;
    if (data.dataVencimento !== undefined) updateData.dataVencimento = data.dataVencimento;
    if (data.dataPagamento !== undefined) updateData.dataPagamento = data.dataPagamento;
    if (data.entryStatus !== undefined) updateData.entryStatus = data.entryStatus;

    return prisma.entry.update({
      where: { id },
      data: updateData,
      include: { message: { select: { text: true, senderName: true, timestamp: true } } },
    });
  },

  async findById(id: string): Promise<Entry | null> {
    return prisma.entry.findUnique({
      where: { id },
      include: { message: { select: { text: true, senderName: true, timestamp: true } } },
    });
  },

  async delete(id: string): Promise<Entry> {
    return prisma.entry.delete({
      where: { id },
    });
  },
};
