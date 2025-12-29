import { Request, Response, NextFunction } from 'express';
import { AgentState } from './states';
import { logViolation } from './violations';

export type AgentStateResolver = (req: Request) => Promise<AgentState> | AgentState;

const defaultAgentStateResolver: AgentStateResolver = (req: Request): AgentState => {
  const stateHeader = req.headers['x-agent-state'] as string;
  
  if (stateHeader === 'killed') return AgentState.KILLED;
  if (stateHeader === 'paused') return AgentState.PAUSED;
  if (stateHeader === 'active') return AgentState.ACTIVE;
  
  return AgentState.ACTIVE;
};

export const createDoctrineGuard = (resolver?: AgentStateResolver) => {
  const getAgentState = resolver || defaultAgentStateResolver;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = await getAgentState(req);
      
      if (state === AgentState.KILLED) {
        const agentId = (req.headers['x-agent-id'] as string) || 'unknown';
        logViolation(agentId, 'Request blocked from killed agent', {
          path: req.path,
          method: req.method,
        });
        
        res.status(403).json({
          error: 'Agent is killed',
          message: 'Requests from killed agents are not allowed',
        });
        return;
      }
      
      next();
    } catch (error) {
      const agentId = (req.headers['x-agent-id'] as string) || 'unknown';
      logViolation(agentId, 'Error in doctrine guard', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
};

