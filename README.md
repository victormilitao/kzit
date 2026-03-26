# Kzit — Registro Financeiro via WhatsApp (TXT + Ollama)

Backend que lê um arquivo `.txt` exportado de um grupo de WhatsApp, classifica cada mensagem com IA local (Ollama) e salva lançamentos financeiros.

## Stack

- **Node.js + TypeScript + Express**
- **PostgreSQL + Prisma**
- **Ollama** (LLM local, gratuito)
- **Zod** (validação)

## Como funciona

1. Você exporta a conversa do grupo WhatsApp (sem mídia) → gera um `.txt`
2. Faz upload do `.txt` para o endpoint `POST /api/upload`
3. O sistema faz parse de cada mensagem, envia para o Ollama classificar
4. Mensagens financeiras viram lançamentos (venda, despesa, receita, estorno)
5. Mensagens de conversa são ignoradas
6. Consulte lançamentos e resumo financeiro via API

## Setup

### 1. Instalar Ollama

```bash
brew install ollama
ollama serve                    # inicia na porta 11434
ollama pull llama3.1            # baixa o modelo (~4.7GB)
# ollama pull gemma3:4b
```

### 2. Banco de dados

```bash
docker run --name kzit-pg \
  -e POSTGRES_PASSWORD=kzit \
  -e POSTGRES_DB=kzit \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Configurar e rodar

```bash
cp .env.example .env            # edite se necessário
npm install
npx prisma migrate dev --name init
npm run dev
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/upload` | Upload de arquivo .txt (multipart, campo `file`) |
| `GET` | `/api/uploads` | Lista uploads |
| `GET` | `/api/uploads/:id` | Detalhes de um upload |
| `GET` | `/api/entries` | Lista lançamentos |
| `GET` | `/api/entries/summary` | Resumo financeiro |
| `GET` | `/api/messages` | Lista mensagens |
| `GET` | `/api/health` | Health check + status do Ollama |

### Filtros (query params)

**GET /api/entries**: `tipo`, `responsavel`, `needsReview`, `uploadId`, `startDate`, `endDate`, `page`, `limit`

**GET /api/entries/summary**: `uploadId`, `startDate`, `endDate`

**GET /api/messages**: `status`, `uploadId`, `startDate`, `endDate`, `page`, `limit`

## Exemplo de uso

### 1. Exportar conversa do WhatsApp
No grupo WhatsApp → ⋮ → Mais → Exportar conversa → Sem mídia → Salvar como `.txt`

### 2. Enviar para o Kzit

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@conversa-grupo.txt"
```

Resposta (202):
```json
{
  "success": true,
  "data": {
    "uploadId": "abc-123",
    "filename": "conversa-grupo.txt",
    "totalMessages": 42,
    "status": "PROCESSING"
  }
}
```

### 3. Verificar progresso

```bash
curl http://localhost:3000/api/uploads/abc-123
```

### 4. Ver lançamentos

```bash
curl http://localhost:3000/api/entries
curl http://localhost:3000/api/entries?tipo=VENDA
curl http://localhost:3000/api/entries/summary
```

## Modelos alternativos do Ollama

Se `llama3.1` for pesado para sua máquina, tente:

| Modelo | Tamanho | OLLAMA_MODEL |
|--------|---------|--------------|
| llama3.2:3b | ~2GB | `llama3.2:3b` |
| mistral | ~4GB | `mistral` |
| gemma2:2b | ~1.6GB | `gemma2:2b` |
| phi3:mini | ~2.3GB | `phi3:mini` |

Atualize `OLLAMA_MODEL` no `.env` conforme o modelo baixado.
