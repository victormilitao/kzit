import { z } from 'zod';

export const spreadsheetRowSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum(['receita', 'despesa', 'compra']),
  descricao: z.string().optional().default(''),
  categoria: z.string().optional().default(''),
  valor: z.number(),
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(''),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(''),
  status: z.enum(['pendente', 'pago', 'atrasado']).optional().default('pendente'),
  formaPagamento: z.string().optional().default(''),
  observacoes: z.string().optional().default(''),
});

export type SpreadsheetRowInput = z.infer<typeof spreadsheetRowSchema>;
