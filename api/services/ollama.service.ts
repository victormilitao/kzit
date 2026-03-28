import { config } from '../lib/config';
import { ollamaResultSchema } from '../schemas/ollama-result.schema';
import { OllamaResult } from '../types';

const SYSTEM_PROMPT = `Extraia dados financeiros de mensagens de WhatsApp de responsáveis de loja. Retorne APENAS JSON.

Campos do JSON:
{"tipo":"venda|despesa|compra|receita|estorno|saldo_anterior|desconhecido","cliente":null,"produto":null,"descricao":"resumo","valor":null,"parcelas":null,"forma_pagamento":"pix|dinheiro|cartao_credito|cartao_debito|boleto|transferencia|null","observacoes":null,"confianca":0.9,"incompleto":false,"campos_faltando":null}

Tipos:
- "venda": venda de produto (ex: "vendi calça pra Ana por 290 3x cartão")
- "despesa": gasto operacional da loja (ex: "despesa: uber 25 pix", "paguei conta de luz 200", "gastei 40 motoboy", "pago costureira 150")
- "compra": compra de produto/material/insumo para a loja (ex: "comprei tecido 300", "compra: linha e botão 50", "comprei embalagem 25 pix")
- "receita": entrada de dinheiro que NÃO é venda (ex: "recebimento 200 pix", "sinal cliente Rosa 200", "entrada pagamento Joana 100", "recebimento: pago em espécie 200")
- "estorno": devolução/cancelamento (ex: "estorno venda da Carla 320")
- "saldo_anterior": saldo inicial (ex: "saldo anterior 5000", "saldo inicial 3200")
- "desconhecido": conversa casual, saudação, foto, pergunta

Regras:
- valor: número puro sem R$ (ex: 290, não "R$290")
- "3x" = parcelas:3, "à vista" = parcelas:null
- Se falta info essencial (venda sem cliente/valor, despesa sem valor), marque incompleto:true e campos_faltando:["campo1"]
- Tolerar erros de digitação e abreviações
- Mensagens com "vendi/venda/vendido" = tipo "venda"
- Mensagens com "despesa/gastei" referente a serviço/operacional = tipo "despesa"
- Mensagens com "comprei/compra" referente a produto/material/insumo = tipo "compra"
- Mensagens com "recebimento/recebido/receber/parcela recebida" = tipo "receita" (PRIORIDADE sobre regras de despesa)
- ATENÇÃO: "pago" ou "paguei" dentro de contexto de "recebimento" significa que o CLIENTE pagou, portanto é "receita", NÃO "despesa". Só classifique como "despesa" quando "pago/paguei" indica um GASTO da loja (ex: "paguei o motoboy", "pago costureira")
- ATENÇÃO: diferencie "compra" de "despesa": "compra" é aquisição de produto/material/insumo (tecido, embalagem, matéria-prima), "despesa" é gasto operacional/serviço (uber, luz, internet, frete, costureira)
- forma_pagamento: DEVE ser EXATAMENTE um dos seguintes valores: "pix", "dinheiro", "cartao_credito", "cartao_debito", "boleto", "transferencia" ou null. Se mencionar apenas "cartão", assuma "cartao_credito". Se mencionar "espécie", assuma "dinheiro".
- confianca: 0.8-1.0 se claro, 0.4-0.7 se ambíguo

Responda APENAS o JSON.`;

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
  error?: string;
}

export const ollamaService = {
  async extractStructuredData(text: string): Promise<OllamaResult> {
    const url = `${config.ollama.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollama.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
          num_predict: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama retornou erro ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content;

    if (!content) {
      throw new Error('Ollama retornou resposta vazia');
    }

    // Tenta extrair JSON da resposta (o modelo pode adicionar texto extra)
    let jsonStr = content.trim();

    // Se tem code block, extrai o conteúdo
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Se começa com texto antes do JSON, tenta encontrar o JSON
    const jsonStartIndex = jsonStr.indexOf('{');
    const jsonEndIndex = jsonStr.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    const parsed = JSON.parse(jsonStr);
    const validated = ollamaResultSchema.parse(parsed);

    return validated;
  },

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${config.ollama.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
