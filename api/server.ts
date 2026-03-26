import { app } from './app';
import { config } from './lib/config';

app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Kzit server running on port ${config.port}`);
  console.log(`📋 Environment: ${config.nodeEnv}`);
  console.log(`🤖 Ollama: ${config.ollama.baseUrl} (model: ${config.ollama.model})`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   http://localhost:${config.port}/api/upload          Upload TXT`);
  console.log(`  GET    http://localhost:${config.port}/api/uploads         Lista uploads`);
  console.log(`  GET    http://localhost:${config.port}/api/uploads/:id     Detalhes upload`);
  console.log(`  GET    http://localhost:${config.port}/api/entries         Lançamentos`);
  console.log(`  GET    http://localhost:${config.port}/api/entries/summary Resumo`);
  console.log(`  GET    http://localhost:${config.port}/api/messages        Mensagens`);
  console.log(`  GET    http://localhost:${config.port}/api/health          Health`);
});
