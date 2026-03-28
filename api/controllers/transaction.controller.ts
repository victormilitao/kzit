import { Request, Response, NextFunction } from 'express';
import { entryQuerySchema, summaryQuerySchema, entryUpdateSchema } from '../schemas/query.schema';
import { transactionService } from '../services/transaction.service';

export const transactionController = {
  async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const result = await transactionService.listTransactions(filters);

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
      const summary = await transactionService.getSummary(uploadId, startDate, endDate);

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  },

  async updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const result = await transactionService.updateTransaction(id, parseResult.data);

      if (!result) {
        res.status(404).json({ success: false, error: 'Transação não encontrada' });
        return;
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await transactionService.deleteTransaction(id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};
