import { EntryType, EntryStatus, MessageStatus } from '@prisma/client';
import { entryRepository } from '../repositories/entry.repository';
import { messageRepository } from '../repositories/message.repository';
import { EntryFilters, MessageFilters, CreateEntryInput, SpreadsheetImportResult } from '../types';
import { spreadsheetService } from './spreadsheet.service';

export const entryService = {
  async createEntry(data: {
    tipo: string;
    descricao?: string | null;
    categoria?: string | null;
    cliente?: string | null;
    produto?: string | null;
    valor?: number | null;
    parcelas?: number | null;
    formaPagamento?: string | null;
    observacoes?: string | null;
    responsavel: string;
    dataVencimento?: string | null;
    dataPagamento?: string | null;
    entryStatus?: string;
  }) {
    const input: CreateEntryInput = {
      tipo: data.tipo as EntryType,
      origin: 'FORM',
      descricao: data.descricao,
      categoria: data.categoria,
      cliente: data.cliente,
      produto: data.produto,
      valor: data.valor,
      parcelas: data.parcelas,
      formaPagamento: data.formaPagamento,
      observacoes: data.observacoes,
      responsavel: data.responsavel,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento.includes('T') ? data.dataVencimento : data.dataVencimento + 'T12:00:00Z') : null,
      dataPagamento: data.dataPagamento ? new Date(data.dataPagamento.includes('T') ? data.dataPagamento : data.dataPagamento + 'T12:00:00Z') : null,
      entryStatus: (data.entryStatus as EntryStatus) || 'PENDENTE',
    };
    return entryRepository.createManual(input);
  },

  async importFromSpreadsheet(
    buffer: Buffer,
    responsavel: string,
    filename: string
  ): Promise<SpreadsheetImportResult> {
    const rows = spreadsheetService.parseFile(buffer, filename);
    const { entries, result } = spreadsheetService.processRows(rows, responsavel);

    if (entries.length > 0) {
      const count = await entryRepository.createBatch(entries);
      result.imported = count;
    }

    return result;
  },

  async listEntries(filters: {
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
    return entryRepository.findAll(entryFilters);
  },

  async getSummary(uploadId?: string, startDate?: string, endDate?: string) {
    return entryRepository.getSummary(
      uploadId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  },

  async updateEntry(
    id: string,
    data: {
      tipo?: string;
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
      dataVencimento?: string | null;
      dataPagamento?: string | null;
      entryStatus?: string;
    }
  ) {
    const existing = await entryRepository.findById(id);
    if (!existing) return null;

    // Se o usuário está editando e marcando como revisado, limpar o motivo
    const updateData: Record<string, unknown> = { ...data };
    if (data.needsReview === false) {
      updateData.reviewReason = null;
    }

    // Convert date strings to Date objects safely
    if (data.dataVencimento !== undefined) {
      updateData.dataVencimento = data.dataVencimento ? new Date(data.dataVencimento.includes('T') ? data.dataVencimento : data.dataVencimento + 'T12:00:00Z') : null;
    }
    if (data.dataPagamento !== undefined) {
      updateData.dataPagamento = data.dataPagamento ? new Date(data.dataPagamento.includes('T') ? data.dataPagamento : data.dataPagamento + 'T12:00:00Z') : null;
    }
    if (data.entryStatus !== undefined) {
      updateData.entryStatus = data.entryStatus as EntryStatus;
    }

    return entryRepository.update(id, {
      ...updateData,
      tipo: data.tipo as EntryType | undefined,
    } as Parameters<typeof entryRepository.update>[1]);
  },

  async deleteEntry(id: string) {
    const existing = await entryRepository.findById(id);
    if (!existing) return null;

    await entryRepository.delete(id);
    return existing;
  },

  async listMessages(filters: {
    status?: string;
    uploadId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const messageFilters: MessageFilters = {
      status: filters.status as MessageStatus | undefined,
      uploadId: filters.uploadId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: filters.page || 1,
      limit: filters.limit || 20,
    };
    return messageRepository.findAll(messageFilters);
  },
};
