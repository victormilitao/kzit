import { Request, Response, NextFunction } from 'express';
import { parseWhatsAppExport } from '../services/whatsapp-parser.service';
import { messageService } from '../services/message.service';
import { ollamaService } from '../services/ollama.service';
import { uploadRepository } from '../repositories/upload.repository';
import { AppError } from '../middlewares/error.middleware';

export const uploadController = {
  async handleUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('Nenhum arquivo enviado. Envie um arquivo .txt', 400);
      }

      // Verifica se o Ollama está disponível
      const ollamaAvailable = await ollamaService.isAvailable();
      if (!ollamaAvailable) {
        throw new AppError(
          'Ollama não está disponível. Verifique se está rodando: ollama serve',
          503
        );
      }

      // Lê e faz parse do conteúdo do arquivo
      const content = req.file.buffer.toString('utf-8');
      const parsedMessages = parseWhatsAppExport(content);

      if (parsedMessages.length === 0) {
        throw new AppError(
          'Nenhuma mensagem válida encontrada no arquivo. Verifique se é um export de WhatsApp.',
          400
        );
      }

      // Cria upload e salva mensagens (filtra duplicatas de uploads anteriores)
      const { uploadId, duplicated } = await messageService.createUpload(
        req.file.originalname,
        parsedMessages
      );

      const uniqueMessages = parsedMessages.length - duplicated;

      if (uniqueMessages === 0) {
        res.status(200).json({
          success: true,
          data: {
            uploadId,
            filename: req.file.originalname,
            totalMessages: 0,
            duplicated,
            status: 'DONE',
            message: `Todas as ${parsedMessages.length} mensagens já foram processadas anteriormente.`,
          },
        });
        return;
      }

      // Responde imediatamente
      res.status(202).json({
        success: true,
        data: {
          uploadId,
          filename: req.file.originalname,
          totalMessages: uniqueMessages,
          duplicated,
          status: 'PROCESSING',
          message: `${uniqueMessages} mensagens novas encontradas${duplicated > 0 ? ` (${duplicated} já processadas anteriormente)` : ''}. Processamento iniciado.`,
        },
      });

      // Processa em background (não bloqueia a resposta)
      messageService.processUpload(uploadId).then((result) => {
        console.log(`[Upload] Processamento concluído:`, result);
      }).catch((error) => {
        console.error(`[Upload] Erro no processamento:`, error);
      });
    } catch (error) {
      next(error);
    }
  },

  async listUploads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await uploadRepository.findAll(page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const upload = await uploadRepository.findById(req.params.id as string);

      if (!upload) {
        throw new AppError('Upload não encontrado', 404);
      }

      res.json({ success: true, data: upload });
    } catch (error) {
      next(error);
    }
  },
};
