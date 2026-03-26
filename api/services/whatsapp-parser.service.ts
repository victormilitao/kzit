import { ParsedMessage } from '../types';

/**
 * Parser para arquivos TXT exportados do WhatsApp.
 *
 * Formatos suportados:
 * - "23/03/2026, 10:30 - Maria: texto da mensagem"
 * - "23/03/2026 10:30 - Maria: texto da mensagem"
 * - "[23/03/2026, 10:30:45] Maria: texto da mensagem"
 * - "3/23/26, 10:30 AM - Maria: texto da mensagem" (formato US)
 *
 * A IA vai lidar com variações no conteúdo,
 * mas o parser precisa separar: data, remetente e texto.
 */

// Regex que captura os formatos mais comuns de exportação do WhatsApp
// Grupo 1: data/hora completa, Grupo 2: nome do remetente, Grupo 3: texto
const MESSAGE_PATTERNS = [
  // Formato BR: "23/03/2026, 10:30 - Nome: texto"
  /^(\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]\s*([^:]+):\s*(.+)$/,
  // Formato com colchetes: "[23/03/2026, 10:30:45] Nome: texto"
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)$/,
  // Formato US: "3/23/26, 10:30 AM - Nome: texto"
  /^(\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–]\s*([^:]+):\s*(.+)$/i,
];

// Mensagens de sistema do WhatsApp que devem ser ignoradas
const SYSTEM_PATTERNS = [
  /mensagens e chamadas são protegidas/i,
  /as mensagens .+ são protegidas/i,
  /criptografia de ponta/i,
  /criou este grupo/i,
  /adicionou\s/i,
  /removeu\s/i,
  /saiu$/i,
  /entrou usando/i,
  /mudou o (assunto|ícone)/i,
  /número mudou/i,
  /você foi adicionad/i,
  /aguardando .+ mensagem/i,
  /essa mensagem foi apagada/i,
  /mensagem apagada/i,
];

// Mensagens de mídia omitida
const MEDIA_PATTERNS = [
  /^<?(imagem|imágem) omitida>?$/i,
  /^<?áudio oc?ultado>?$/i,
  /^<?figurinha omitida>?$/i,
  /^<?documento omitido>?$/i,
  /^<?vídeo omitido>?$/i,
  /^<?gif omitido>?$/i,
  /^<?contato omitido>?$/i,
  /^<?localização omitida>?$/i,
  /^<?mídia omitida>?$/i,
  /^<?media omitted>?$/i,
];

function isSystemMessage(line: string): boolean {
  return SYSTEM_PATTERNS.some((pattern) => pattern.test(line));
}

function isMediaMessage(text: string): boolean {
  const trimmed = text.trim();
  return MEDIA_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function parseTimestamp(dateStr: string): Date {
  // Limpa caracteres invisíveis e espaços extras
  const clean = dateStr.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();

  // Tenta formato BR: "23/03/2026, 10:30" ou "23/03/2026 10:30"
  const brMatch = clean.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );

  if (brMatch) {
    const [, day, month, yearStr, hours, minutes, seconds] = brMatch;
    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    return new Date(
      year,
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      seconds ? parseInt(seconds, 10) : 0
    );
  }

  // Fallback: tenta parse nativo
  const fallback = new Date(clean);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return new Date();
}

function tryParseLine(line: string): { timestamp: string; senderName: string; text: string } | null {
  // Remove caracteres invisíveis Unicode (LRM, RLM, etc.)
  const cleanLine = line.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();

  if (!cleanLine) return null;

  for (const pattern of MESSAGE_PATTERNS) {
    const match = cleanLine.match(pattern);
    if (match) {
      return {
        timestamp: match[1].trim(),
        senderName: match[2].trim(),
        text: match[3].trim(),
      };
    }
  }

  return null;
}

export function parseWhatsAppExport(content: string): ParsedMessage[] {
  const lines = content.split('\n');
  const messages: ParsedMessage[] = [];
  let currentMessage: { timestamp: string; senderName: string; text: string } | null = null;

  for (const line of lines) {
    const parsed = tryParseLine(line);

    if (parsed) {
      // Se já tem uma mensagem em buffer, salva ela
      if (currentMessage) {
        const fullText = currentMessage.text;

        // Pula mensagens de sistema e mídia
        if (!isSystemMessage(fullText) && !isMediaMessage(fullText) && fullText.length > 0) {
          messages.push({
            timestamp: parseTimestamp(currentMessage.timestamp),
            senderName: currentMessage.senderName,
            text: fullText,
          });
        }
      }

      // Inicia nova mensagem
      currentMessage = parsed;
    } else if (currentMessage) {
      // Linha sem prefixo de data = continuação da mensagem anterior (multiline)
      const cleanLine = line.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
      if (cleanLine) {
        currentMessage.text += '\n' + cleanLine;
      }
    }
    // Se não tem currentMessage e não deu match, ignora (cabeçalho do arquivo, etc.)
  }

  // Salva a última mensagem do buffer
  if (currentMessage) {
    const fullText = currentMessage.text;
    if (!isSystemMessage(fullText) && !isMediaMessage(fullText) && fullText.length > 0) {
      messages.push({
        timestamp: parseTimestamp(currentMessage.timestamp),
        senderName: currentMessage.senderName,
        text: fullText,
      });
    }
  }

  return messages;
}
