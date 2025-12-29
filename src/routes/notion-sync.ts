import { Router, Request, Response } from 'express';
import { enqueueTask } from '../agents/notion-sync-agent/taskQueue';
import { createDoctrineGuard } from '../doctrine';

const router = Router();

// Aplica doctrine guard para validar estado dos agents
const doctrineGuard = createDoctrineGuard();

/**
 * POST /notion-sync/tasks
 * Endpoint para outros agents enviarem tarefas ao Notion Sync Agent
 */
router.post('/tasks', doctrineGuard, async (req: Request, res: Response) => {
  const sourceAgentId = (req.headers['x-agent-id'] as string) || 'unknown';
  
  try {
    const { type, content, pageId, priority, metadata } = req.body;

    // Validação básica
    if (!type || !content) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'type and content are required',
      });
      return;
    }

    if (type !== 'log' && type !== 'create') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'type must be "log" or "create"',
      });
      return;
    }

    if (type === 'log' && !pageId) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'pageId is required for log tasks',
      });
      return;
    }

    // Adiciona tarefa à fila
    const taskId = await enqueueTask({
      type,
      content,
      pageId,
      sourceAgentId,
      priority: priority || 'normal',
      metadata: metadata || {},
    });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'task_enqueued',
      sourceAgentId,
      taskId,
      type,
    }));

    res.status(201).json({
      status: 'enqueued',
      taskId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      error: 'Error enqueueing task',
      sourceAgentId,
      message: error instanceof Error ? error.message : String(error),
    }));

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /notion-sync/health
 * Health check do Notion Sync Agent
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Notion-Sync-Agent',
    timestamp: new Date().toISOString(),
  });
});

export default router;

