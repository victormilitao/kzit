import { EntryType } from '@prisma/client';
import { config } from '../lib/config';
import { prisma } from '../lib/prisma';
import { uploadRepository } from '../repositories/upload.repository';
import { messageRepository } from '../repositories/message.repository';
import { entryRepository } from '../repositories/entry.repository';
import { ollamaService } from './ollama.service';
import { ParsedMessage, ProcessResult } from '../types';

function mapTypeToEnum(tipo: string): EntryType {
  const mapping: Record<string, EntryType> = {
    venda: 'VENDA',
    despesa: 'DESPESA',
    compra: 'COMPRA',
    receita: 'RECEITA',
    estorno: 'ESTORNO',
    saldo_anterior: 'SALDO_ANTERIOR',
    desconhecido: 'DESCONHECIDO',
  };
  return mapping[tipo.toLowerCase()] || 'DESCONHECIDO';
}

/**
 * Filtra mensagens duplicadas (já existem em uploads anteriores).
 * Usa a constraint unique (senderName, text, timestamp).
 */
async function filterDuplicates(
  parsedMessages: ParsedMessage[]
): Promise<{ unique: ParsedMessage[]; duplicated: number }> {
  if (parsedMessages.length === 0) return { unique: [], duplicated: 0 };

  // Busca mensagens existentes com mesmo (senderName, text, timestamp)
  const existing = await prisma.message.findMany({
    where: {
      OR: parsedMessages.map((msg) => ({
        senderName: msg.senderName,
        text: msg.text,
        timestamp: msg.timestamp,
      })),
    },
    select: { senderName: true, text: true, timestamp: true },
  });

  // Cria set de chaves para lookup rápido
  const existingKeys = new Set(
    existing.map((m) => `${m.senderName}|${m.text}|${m.timestamp.toISOString()}`)
  );

  const unique = parsedMessages.filter(
    (msg) => !existingKeys.has(`${msg.senderName}|${msg.text}|${msg.timestamp.toISOString()}`)
  );

  return {
    unique,
    duplicated: parsedMessages.length - unique.length,
  };
}

/**
 * Determina se um lançamento precisa de revisão e o motivo.
 */
function determineReviewStatus(
  tipo: EntryType,
  ollamaResult: {
    confianca: number;
    incompleto: boolean;
    campos_faltando: string[] | null;
    valor: number | null;
  }
): { needsReview: boolean; reviewReason: string | null } {
  const reasons: string[] = [];

  // Confiança baixa
  if (ollamaResult.confianca < config.confidence.threshold) {
    reasons.push(`Confiança baixa (${Math.round(ollamaResult.confianca * 100)}%)`);
  }

  // Tipo desconhecido que não foi ignorado
  if (tipo === 'DESCONHECIDO') {
    reasons.push('Tipo não identificado com certeza');
  }

  // Lançamento incompleto (faltam campos essenciais)
  if (ollamaResult.incompleto && ollamaResult.campos_faltando?.length) {
    reasons.push(`Campos faltando: ${ollamaResult.campos_faltando.join(', ')}`);
  }

  // Valor ausente em lançamento que deveria ter valor
  if (ollamaResult.valor == null && tipo !== 'DESCONHECIDO') {
    reasons.push('Valor não informado');
  }

  return {
    needsReview: reasons.length > 0,
    reviewReason: reasons.length > 0 ? reasons.join('; ') : null,
  };
}

export const messageService = {
  async createUpload(filename: string, parsedMessages: ParsedMessage[]): Promise<{ uploadId: string; duplicated: number }> {
    // Filtrar duplicatas (mensagens já processadas em uploads anteriores)
    const { unique, duplicated } = await filterDuplicates(parsedMessages);

    // Criar upload com contagem de mensagens únicas
    const upload = await uploadRepository.create({
      filename,
      totalMessages: unique.length,
    });

    // Salvar mensagens únicas em lote
    if (unique.length > 0) {
      await messageRepository.createMany(
        unique.map((msg) => ({
          uploadId: upload.id,
          senderName: msg.senderName,
          text: msg.text,
          timestamp: msg.timestamp,
          status: 'PENDING' as const,
        }))
      );
    }

    return { uploadId: upload.id, duplicated };
  },

  async processUpload(uploadId: string): Promise<ProcessResult> {
    const result: ProcessResult = {
      uploadId,
      totalMessages: 0,
      processed: 0,
      ignored: 0,
      failed: 0,
      duplicated: 0,
    };

    try {
      await uploadRepository.updateStatus(uploadId, 'PROCESSING');

      const messages = await messageRepository.findByUploadId(uploadId);
      result.totalMessages = messages.length;

      for (const message of messages) {
        try {
          const ollamaResult = await ollamaService.extractStructuredData(message.text);
          const tipo = mapTypeToEnum(ollamaResult.tipo);

          // Se é desconhecido com alta confiança, marcar como ignorada
          if (tipo === 'DESCONHECIDO' && ollamaResult.confianca >= 0.8) {
            await messageRepository.updateStatus(message.id, 'IGNORED');
            result.ignored++;
          } else {
            const { needsReview, reviewReason } = determineReviewStatus(tipo, ollamaResult);

            await entryRepository.create({
              messageId: message.id,
              tipo,
              cliente: ollamaResult.cliente,
              produto: ollamaResult.produto,
              descricao: ollamaResult.descricao,
              valor: ollamaResult.valor,
              parcelas: ollamaResult.parcelas,
              formaPagamento: ollamaResult.forma_pagamento,
              observacoes: ollamaResult.observacoes,
              confianca: ollamaResult.confianca,
              responsavel: message.senderName,
              needsReview,
              reviewReason,
            });

            await messageRepository.updateStatus(message.id, 'PROCESSED');
            result.processed++;
          }

          // Atualizar progresso
          await uploadRepository.updateProgress(
            uploadId,
            result.processed + result.ignored + result.failed
          );
        } catch (error) {
          console.error(`[MessageService] Erro ao processar mensagem ${message.id}:`, error);
          await messageRepository.updateStatus(message.id, 'FAILED');
          result.failed++;
        }
      }

      await uploadRepository.updateProgress(
        uploadId,
        result.processed + result.ignored + result.failed,
        'DONE'
      );
    } catch (error) {
      console.error(`[MessageService] Erro ao processar upload ${uploadId}:`, error);
      await uploadRepository.updateStatus(uploadId, 'FAILED');
    }

    return result;
  },
};
