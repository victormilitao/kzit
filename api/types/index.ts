import { EntryType, EntryOrigin, EntryStatus, MessageStatus, UploadStatus } from '@prisma/client';

export interface ParsedMessage {
  timestamp: Date;
  senderName: string;
  text: string;
}

export interface OllamaResult {
  tipo: 'venda' | 'despesa' | 'receita' | 'estorno' | 'saldo_anterior' | 'desconhecido';
  cliente: string | null;
  produto: string | null;
  descricao: string | null;
  valor: number | null;
  parcelas: number | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  confianca: number;
  incompleto: boolean;
  campos_faltando: string[] | null;
}

export interface ProcessResult {
  uploadId: string;
  totalMessages: number;
  processed: number;
  ignored: number;
  failed: number;
  duplicated: number;
}

export interface EntryFilters {
  tipo?: EntryType;
  responsavel?: string;
  needsReview?: boolean;
  origin?: EntryOrigin;
  startDate?: Date;
  endDate?: Date;
  uploadId?: string;
  page?: number;
  limit?: number;
}

export interface MessageFilters {
  status?: MessageStatus;
  uploadId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface SummaryResult {
  totalVendas: number;
  totalDespesas: number;
  totalReceitas: number;
  totalEstornos: number;
  saldoAnterior: number;
  saldo: number;
  totalLancamentos: number;
  pendentesRevisao: number;
}

export interface CreateEntryInput {
  tipo: EntryType;
  origin: EntryOrigin;
  descricao?: string | null;
  categoria?: string | null;
  cliente?: string | null;
  produto?: string | null;
  valor?: number | null;
  parcelas?: number | null;
  formaPagamento?: string | null;
  observacoes?: string | null;
  responsavel: string;
  dataVencimento?: Date | null;
  dataPagamento?: Date | null;
  entryStatus?: EntryStatus;
}

export interface SpreadsheetRow {
  id: string;
  tipo: string;
  descricao: string;
  categoria: string;
  valor: number;
  dataVencimento: string;
  dataPagamento: string;
  status: string;
  formaPagamento: string;
  observacoes: string;
}

export interface SpreadsheetImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}
