import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const dbConnected = await pool.query('SELECT 1')
    .then(() => true)
    .catch((error) => {
      console.error('Health check database query failed:', error);
      return false;
    });
  
  res.status(200).json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;

