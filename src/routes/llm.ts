import { Router, Request, Response } from 'express';
import { AgentState } from '../doctrine/states';
import { llmService, llmCache } from '../llm';
import { LLMRequest, LLMResponse, LLMLog } from '../types/llm';
import { createDoctrineGuard } from '../doctrine';

const router = Router();

// Generate a unique request ID
const generateRequestId = (): string => {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Custom agent state resolver that checks agent state before processing
const agentStateResolver = async (req: Request): Promise<AgentState> => {
  const stateHeader = req.headers['x-agent-state'] as string;
  const agentId = req.headers['x-agent-id'] as string || 'unknown';

  if (stateHeader === 'killed') {
    const log: LLMLog = {
      timestamp: new Date().toISOString(),
      type: 'llm_error',
      agentId,
      requestId: req.headers['x-request-id'] as string || generateRequestId(),
      error: 'Request blocked: Agent is in killed state',
      details: {
        agentState: 'killed',
        path: req.path,
        method: req.method,
      },
    };
    console.log(JSON.stringify(log, null, 2));
    return AgentState.KILLED;
  }

  if (stateHeader === 'paused') {
    const log: LLMLog = {
      timestamp: new Date().toISOString(),
      type: 'llm_error',
      agentId,
      requestId: req.headers['x-request-id'] as string || generateRequestId(),
      error: 'Request blocked: Agent is in paused state',
      details: {
        agentState: 'paused',
        path: req.path,
        method: req.method,
      },
    };
    console.log(JSON.stringify(log, null, 2));
    return AgentState.PAUSED;
  }

  return AgentState.ACTIVE;
};

// Apply doctrine guard with custom resolver
const doctrineGuard = createDoctrineGuard(agentStateResolver);

// Main LLM endpoint - /llm-query
router.post('/llm-query', doctrineGuard, async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  const agentId = (req.headers['x-agent-id'] as string) || 'unknown';

  try {
    // Validate request body
    const { prompt, model, temperature, maxTokens, useCache } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      const errorLog: LLMLog = {
        timestamp: new Date().toISOString(),
        type: 'llm_error',
        agentId,
        requestId,
        error: 'Invalid request: prompt is required and must be a non-empty string',
      };
      console.log(JSON.stringify(errorLog, null, 2));

      res.status(400).json({
        error: 'Invalid request',
        message: 'prompt is required and must be a non-empty string',
      });
      return;
    }

    // Build LLM request
    const llmRequest: LLMRequest = {
      prompt: prompt.trim(),
      agentId,
      model,
      temperature,
      maxTokens,
      useCache,
    };

    // Process the request
    const response: LLMResponse = await llmService.processRequest(llmRequest, requestId);

    res.status(200).json(response);
  } catch (error) {
    const errorLog: LLMLog = {
      timestamp: new Date().toISOString(),
      type: 'llm_error',
      agentId,
      requestId,
      error: error instanceof Error ? error.message : String(error),
      details: {
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
    console.log(JSON.stringify(errorLog, null, 2));

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// Health check endpoint for LLM gateway
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Endurance-LLM-Gateway',
    timestamp: new Date().toISOString(),
    cache: {
      size: llmCache.size(),
    },
  });
});

export default router;

