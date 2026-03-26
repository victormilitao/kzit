import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.API_PORT || process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1',
  },
  confidence: {
    threshold: 0.8,
  },
};
