import express, { Express } from 'express';
import healthRouter from './routes/health';
import infraRouter from './routes/infra';
import llmRouter from './routes/llm';
import authRouter from './routes/auth';
import { createDoctrineGuard } from './doctrine';
import { throttleMiddleware } from './llm';
import { authenticate } from './auth/middleware';

export const createServer = (): Express => {
  const app = express();
  
  app.use(express.json());
  
  const doctrineGuard = createDoctrineGuard();
  
  app.use('/health', healthRouter);
  app.use('/infra', doctrineGuard, infraRouter);
  
  // Auth routes
  app.use('/api/v1/auth', authRouter);
  
  // Protected route example
  app.get('/api/v1/me', authenticate, (req, res) => {
    res.json({ user: req.user });
  });
  
  // LLM Gateway routes with throttling and doctrine guard
  app.use('/', throttleMiddleware, llmRouter);
  
  return app;
};

