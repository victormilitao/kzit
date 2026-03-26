import { z } from 'zod';

export const ollamaResultSchema = z.object({
  tipo: z.enum(['venda', 'despesa', 'receita', 'estorno', 'saldo_anterior', 'desconhecido']),
  cliente: z.string().nullable().default(null),
  produto: z.string().nullable().default(null),
  descricao: z.string().nullable().default(null),
  valor: z.number().nullable().default(null),
  parcelas: z.number().int().nullable().default(null),
  forma_pagamento: z.string().nullable().default(null),
  observacoes: z.string().nullable().default(null),
  confianca: z.number().min(0).max(1).default(0),
  incompleto: z.boolean().default(false),
  campos_faltando: z.array(z.string()).nullable().default(null),
});

export type OllamaResultInput = z.infer<typeof ollamaResultSchema>;
