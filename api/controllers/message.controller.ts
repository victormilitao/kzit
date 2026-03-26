import { Request, Response, NextFunction } from 'express';
import { messageQuerySchema } from '../schemas/query.schema';
import { entryService } from '../services/entry.service';

export const messageController = {
  async listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = messageQuerySchema.safeParse(req.query);
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
      const result = await entryService.listMessages(filters);

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
};
