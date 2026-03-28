import { z } from 'zod';

export const entryQuerySchema = z.object({
  tipo: z
    .enum(['VENDA', 'DESPESA', 'COMPRA', 'RECEITA', 'ESTORNO', 'DESCONHECIDO'])
    .optional(),
  responsavel: z.string().optional(),
  needsReview: z
    .preprocess(
      (val) => (val === '' || val === undefined ? undefined : val === 'true'),
      z.boolean().optional(),
    ),
  uploadId: z.string().uuid().optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .optional(),
});

export const messageQuerySchema = z.object({
  status: z.enum(['PENDING', 'PROCESSED', 'FAILED', 'IGNORED']).optional(),
  uploadId: z.string().uuid().optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .optional(),
});

export const summaryQuerySchema = z.object({
  uploadId: z.string().uuid().optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export type EntryQueryInput = z.infer<typeof entryQuerySchema>;
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
export type SummaryQueryInput = z.infer<typeof summaryQuerySchema>;

export const entryUpdateSchema = z.object({
  tipo: z
    .enum(['VENDA', 'DESPESA', 'COMPRA', 'RECEITA', 'ESTORNO', 'SALDO_ANTERIOR', 'DESCONHECIDO'])
    .optional(),
  cliente: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  categoria: z.string().nullable().optional(),
  valor: z.number().nullable().optional(),
  parcelas: z.number().int().nullable().optional(),
  formaPagamento: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  needsReview: z.boolean().optional(),
  dataVencimento: z.string().nullable().optional(),
  dataPagamento: z.string().nullable().optional(),
  entryStatus: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).optional(),
});

export const entryCreateSchema = z.object({
  tipo: z.enum(['VENDA', 'DESPESA', 'COMPRA', 'RECEITA', 'ESTORNO', 'SALDO_ANTERIOR']),
  descricao: z.string().nullable().optional(),
  categoria: z.string().nullable().optional(),
  cliente: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  valor: z.number().nullable().optional(),
  parcelas: z.number().int().nullable().optional(),
  formaPagamento: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  responsavel: z.string().min(1),
  dataVencimento: z.string().nullable().optional(),
  dataPagamento: z.string().nullable().optional(),
  entryStatus: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).optional(),
});
