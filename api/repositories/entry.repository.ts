import { Prisma, Entry, Transaction, EntryType, EntryOrigin, EntryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { EntryFilters, SummaryResult, CreateEntryInput } from '../types';

export type EntryWithRelations = Entry & { 
  transaction: Transaction & { 
     message: { text: string; senderName: string; timestamp: Date } | null 
  } 
};

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
    const numParcelas = data.parcelas && data.parcelas > 0 ? data.parcelas : 1;
    const valorNum = data.valor || 0;
    const valorParcela = valorNum / numParcelas;

    const transaction = await prisma.transaction.create({
      data: {
        messageId: data.messageId,
        tipo: data.tipo,
        origin: 'WHATSAPP',
        cliente: data.cliente,
        produto: data.produto,
        descricao: data.descricao,
        valorTotal: new Prisma.Decimal(valorNum),
        parcelas: numParcelas,
        formaPagamento: data.formaPagamento,
        observacoes: data.observacoes,
        confianca: data.confianca,
        responsavel: data.responsavel,
      },
    });

    const entriesData = [];
    for (let i = 1; i <= numParcelas; i++) {
        let fpLower = data.formaPagamento ? data.formaPagamento.toLowerCase().trim() : '';
        let isImediato = fpLower === 'pix' || fpLower === 'dinheiro' || fpLower === 'espécie' || fpLower === 'especie' || fpLower.includes('debito') || fpLower.includes('débito');
        let entryStatus: EntryStatus = (i === 1 && (isImediato || data.tipo === 'SALDO_ANTERIOR')) ? 'PAGO' : 'PENDENTE';
        let dataVencimento = new Date();
        dataVencimento.setUTCHours(12, 0, 0, 0); // avoid exactly 00:00 UTC jumping backward

        if (!isImediato) {
            dataVencimento.setMonth(dataVencimento.getMonth() + i);
        } else {
            if (i > 1) {
                dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
            }
        }

        let dataPagamento = entryStatus === 'PAGO' ? new Date() : null;
        if (dataPagamento) dataPagamento.setUTCHours(12, 0, 0, 0);

        entriesData.push({
            transactionId: transaction.id,
            numeroParcela: i,
            valor: new Prisma.Decimal(valorParcela),
            dataVencimento,
            dataPagamento,
            entryStatus,
            needsReview: data.needsReview,
            reviewReason: data.reviewReason,
        });
    }

    await prisma.entry.createMany({ data: entriesData });
    const entries = await prisma.entry.findMany({ where: { transactionId: transaction.id }, orderBy: { numeroParcela: 'asc' } });
    return entries[0];
  },

  async createManual(data: CreateEntryInput): Promise<Entry> {
    const numParcelas = data.parcelas && data.parcelas > 0 ? data.parcelas : 1;
    const valorNum = data.valor || 0;
    const valorParcela = valorNum / numParcelas;

    const transaction = await prisma.transaction.create({
      data: {
        tipo: data.tipo,
        origin: data.origin,
        descricao: data.descricao,
        categoria: data.categoria,
        cliente: data.cliente,
        produto: data.produto,
        valorTotal: new Prisma.Decimal(valorNum),
        parcelas: numParcelas,
        formaPagamento: data.formaPagamento,
        observacoes: data.observacoes,
        confianca: 1.0,
        responsavel: data.responsavel,
      },
    });

    const entriesData = [];
    for (let i = 1; i <= numParcelas; i++) {
        // If from form, already correctly shifted by T12:00:00 in service if provided
        let dataVencimento = data.dataVencimento ? new Date(data.dataVencimento) : new Date();
        if (!data.dataVencimento) {
            dataVencimento.setUTCHours(12, 0, 0, 0);
        }

        let fpLower = data.formaPagamento ? data.formaPagamento.toLowerCase().trim() : '';
        let isImediato = fpLower === 'pix' || fpLower === 'dinheiro' || fpLower === 'espécie' || fpLower === 'especie' || fpLower.includes('debito') || fpLower.includes('débito');

        if (!isImediato) {
            dataVencimento.setMonth(dataVencimento.getMonth() + i);
        } else {
            if (i > 1) {
                dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
            }
        }
        
        let dataPagamento = i === 1 ? data.dataPagamento : null;
        let status: EntryStatus = i === 1 ? (data.entryStatus || 'PENDENTE') : 'PENDENTE';

        entriesData.push({
            transactionId: transaction.id,
            numeroParcela: i,
            valor: new Prisma.Decimal(valorParcela),
            dataVencimento,
            dataPagamento,
            entryStatus: status,
            needsReview: false,
        });
    }

    await prisma.entry.createMany({ data: entriesData });
    const entries = await prisma.entry.findMany({ where: { transactionId: transaction.id }, orderBy: { numeroParcela: 'asc' } });
    return entries[0];
  },

  async createBatch(entries: CreateEntryInput[]): Promise<number> {
    let count = 0;
    for (const data of entries) {
      await this.createManual(data);
      count++;
    }
    return count;
  },

  async findAll(filters: EntryFilters): Promise<{ data: EntryWithRelations[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EntryWhereInput = {};

    const transactionWhere: Prisma.TransactionWhereInput = {};

    if (filters.tipo) transactionWhere.tipo = filters.tipo;
    if (filters.responsavel) transactionWhere.responsavel = { contains: filters.responsavel, mode: 'insensitive' };
    if (filters.origin) transactionWhere.origin = filters.origin;
    if (filters.uploadId) transactionWhere.message = { uploadId: filters.uploadId };

    if (Object.keys(transactionWhere).length > 0) {
        where.transaction = transactionWhere;
    }

    if (filters.startDate || filters.endDate) {
      where.dataVencimento = {};
      if (filters.startDate) where.dataVencimento.gte = filters.startDate;
      if (filters.endDate) where.dataVencimento.lte = filters.endDate;
    }

    const [data, total] = await Promise.all([
      prisma.entry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataVencimento: 'desc' },
        include: { transaction: { include: { message: { select: { text: true, senderName: true, timestamp: true } } } } },
      }),
      prisma.entry.count({ where }),
    ]);

    return { data, total };
  },

  async getSummary(uploadId?: string, startDate?: Date, endDate?: Date): Promise<SummaryResult> {
    const where: Prisma.EntryWhereInput = {
      transaction: {
        tipo: { not: 'DESCONHECIDO' },
      }
    };

    if (uploadId) where.transaction = { ...where.transaction, message: { uploadId } } as any;

    if (startDate || endDate) {
      where.dataVencimento = {};
      if (startDate) where.dataVencimento.gte = startDate;
      if (endDate) where.dataVencimento.lte = endDate;
    }

    const entries = await prisma.entry.findMany({
      where,
      select: { valor: true, needsReview: true, entryStatus: true, transaction: { select: { tipo: true, confianca: true } } },
    });

    let totalVendas = 0;
    let totalDespesas = 0;
    let totalCompras = 0;
    let totalReceitas = 0;
    let totalEstornos = 0;
    let saldoAnterior = 0;
    let pendentesRevisao = 0;
    let totalLancamentos = 0;

    for (const entry of entries) {
      if (entry.needsReview) pendentesRevisao++;
      totalLancamentos++;

      if (entry.transaction.confianca < 0.8) continue;

      const valor = entry.valor ? Number(entry.valor) : 0;
      const isPago = entry.entryStatus === 'PAGO';

      if (isPago) {
        switch (entry.transaction.tipo) {
          case 'VENDA': totalVendas += valor; break;
          case 'DESPESA': totalDespesas += valor; break;
          case 'COMPRA': totalCompras += valor; break;
          case 'RECEITA': totalReceitas += valor; break;
          case 'ESTORNO': totalDespesas += valor; break;
          case 'SALDO_ANTERIOR': saldoAnterior += valor; break;
        }
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
      // totalVendas = vendas, totalReceitas = outras receitas (não-venda)
      totalLancamentos,
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
  ): Promise<EntryWithRelations> {
    const entryUpdateData: Prisma.EntryUpdateInput = {};
    const trxUpdateData: Prisma.TransactionUpdateInput = {};

    let hasTrxUpdate = false;

    if (data.tipo !== undefined) { trxUpdateData.tipo = data.tipo; hasTrxUpdate = true; }
    if (data.cliente !== undefined) { trxUpdateData.cliente = data.cliente; hasTrxUpdate = true; }
    if (data.produto !== undefined) { trxUpdateData.produto = data.produto; hasTrxUpdate = true; }
    if (data.descricao !== undefined) { trxUpdateData.descricao = data.descricao; hasTrxUpdate = true; }
    if (data.categoria !== undefined) { trxUpdateData.categoria = data.categoria; hasTrxUpdate = true; }
    if (data.valor !== undefined) { entryUpdateData.valor = data.valor != null ? new Prisma.Decimal(data.valor) : null; }
    // Note: parcelas update on an existing installment is complex, leaving it out or applying to trx if needed
    if (data.parcelas !== undefined) { trxUpdateData.parcelas = data.parcelas; hasTrxUpdate = true; }
    if (data.formaPagamento !== undefined) { trxUpdateData.formaPagamento = data.formaPagamento; hasTrxUpdate = true; }
    if (data.observacoes !== undefined) { trxUpdateData.observacoes = data.observacoes; hasTrxUpdate = true; }
    
    if (data.needsReview !== undefined) {
      entryUpdateData.needsReview = data.needsReview;
      if (data.needsReview === false) {
        trxUpdateData.confianca = 1.0;
        hasTrxUpdate = true;
      }
    }
    if (data.reviewReason !== undefined) entryUpdateData.reviewReason = data.reviewReason;
    if (data.dataVencimento !== undefined) entryUpdateData.dataVencimento = data.dataVencimento;
    if (data.dataPagamento !== undefined) entryUpdateData.dataPagamento = data.dataPagamento;
    if (data.entryStatus !== undefined) entryUpdateData.entryStatus = data.entryStatus;

    // We must fetch the entry to know its transactionId
    const entry = await prisma.entry.findUnique({ where: { id } });
    if (!entry) throw new Error("Entry not found");

    if (hasTrxUpdate) {
        await prisma.transaction.update({
            where: { id: entry.transactionId },
            data: trxUpdateData
        });
    }

    return prisma.entry.update({
      where: { id },
      data: entryUpdateData,
      include: { transaction: { include: { message: { select: { text: true, senderName: true, timestamp: true } } } } },
    });
  },

  async findById(id: string): Promise<EntryWithRelations | null> {
    return prisma.entry.findUnique({
      where: { id },
      include: { transaction: { include: { message: { select: { text: true, senderName: true, timestamp: true } } } } },
    });
  },

  async delete(id: string): Promise<Entry> {
    // Current delete behavior: if they delete a single installment, we delete the installment.
    // If we want to delete the whole transaction, we could do it. Let's stick to returning Entry for now.
    const entry = await prisma.entry.delete({
      where: { id },
    });
    // Check if it was the last entry of the transaction, if so delete the transaction
    const remaining = await prisma.entry.count({ where: { transactionId: entry.transactionId } });
    if (remaining === 0) {
        await prisma.transaction.delete({ where: { id: entry.transactionId } });
    }
    return entry;
  },
};
