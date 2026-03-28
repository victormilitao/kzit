import { Router } from 'express';
import multer from 'multer';
import { uploadController } from '../controllers/upload.controller';
import { entryController } from '../controllers/entry.controller';
import { transactionController } from '../controllers/transaction.controller';
import { messageController } from '../controllers/message.controller';

const router = Router();

// Multer config: aceita .txt, .csv, .xlsx e .xls, memória (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.txt', '.csv', '.xlsx', '.xls'];
    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExt = allowedExtensions.some((ext) => file.originalname.toLowerCase().endsWith(ext));

    if (hasValidMime || hasValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .txt, .csv, .xlsx e .xls são aceitos'));
    }
  },
});

// Upload de arquivo TXT (WhatsApp)
router.post('/upload', upload.single('file'), uploadController.handleUpload);
router.get('/uploads', uploadController.listUploads);
router.get('/uploads/:id', uploadController.getUpload);

// Lançamentos
router.post('/entries', entryController.createEntry);
router.post('/entries/import', upload.single('file'), entryController.importSpreadsheet);
router.get('/entries', entryController.listEntries);
router.get('/entries/summary', entryController.getSummary);
router.patch('/entries/:id', entryController.updateEntry);
router.delete('/entries/:id', entryController.deleteEntry);

// Faturamento (Transactions)
router.get('/transactions', transactionController.listTransactions);
router.get('/transactions/summary', transactionController.getSummary);
router.patch('/transactions/:id', transactionController.updateTransaction);
router.delete('/transactions/:id', transactionController.deleteTransaction);


// Mensagens
router.get('/messages', messageController.listMessages);

// Health check
router.get('/health', async (_req, res) => {
  const { ollamaService } = await import('../services/ollama.service');
  const ollamaOk = await ollamaService.isAvailable();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollama: ollamaOk ? 'connected' : 'disconnected',
  });
});

export { router };
