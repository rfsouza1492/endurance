import { createServer } from './server';
import { testConnection } from './config/database';
import { startGuardian } from './guardian';
import { startNotionSyncAgent } from './agents/notion-sync-agent';
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
        llmQuery: '/llm-query',
        health: '/llm/health',
        notionSync: '/notion-sync/tasks',
        infraAlerts: '/infra/infra-alerts',
      },
    }, null, 2));
    console.log(`Server running on port ${PORT}`);
  });

  // Inicia Guardian
  startGuardian();
  
  // Inicia Notion Sync Agent
  startNotionSyncAgent();
};

startServer();

