import { createServer } from './server';
import { testConnection } from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('ERROR: Cannot connect to database. Server startup aborted.');
    process.exit(1);
  }
  
  const app = createServer();
  
  app.listen(PORT, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'Endurance-Engine-Room',
      status: 'listening',
      port: PORT,
      endpoints: {
        health: '/health',
        auth: '/api/v1/auth',
        llmQuery: '/llm-query',
        llmHealth: '/llm/health',
        infra: '/infra',
        me: '/api/v1/me',
      },
    }, null, 2));
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

