import { Request, Response, NextFunction } from 'express';
import { entryQuerySchema, summaryQuerySchema, entryUpdateSchema, entryCreateSchema } from '../schemas/query.schema';
import { entryService } from '../services/entry.service';

export const entryController = {
  async createEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = entryCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const entry = await entryService.createEntry(parseResult.data);
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  },

  async importSpreadsheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
        return;
      }

      const responsavel = req.body.responsavel;
      if (!responsavel || typeof responsavel !== 'string' || responsavel.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Campo "responsavel" é obrigatório' });
        return;
      }

      const result = await entryService.importFromSpreadsheet(req.file.buffer, responsavel.trim());
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async listEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = entryQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros de consulta inválidos',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const filters = parseResult.data;
      const result = await entryService.listEntries(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = summaryQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros de consulta inválidos',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const { uploadId, startDate, endDate } = parseResult.data;
      const summary = await entryService.getSummary(uploadId, startDate, endDate);

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  },

  async updateEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const parseResult = entryUpdateSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const updated = await entryService.updateEntry(id, parseResult.data);

      if (!updated) {
        res.status(404).json({ success: false, error: 'Lançamento não encontrado' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async deleteEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const deleted = await entryService.deleteEntry(id);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Lançamento não encontrado' });
        return;
      }

      res.json({ success: true, data: deleted });
    } catch (error) {
      next(error);
    }
  },
};
