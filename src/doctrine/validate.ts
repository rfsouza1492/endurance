import pool from '../config/database';
import { AgentState } from './states';
import { logViolation } from './violations';

/**
 * Validates agent state from database and throws error if agent is killed or paused
 * @param agentId - The ID of the agent to validate
 * @throws Error if agent is killed or paused
 */
export async function validateAgentState(agentId: string): Promise<void> {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query<{ state: string }>(
        'SELECT state FROM agents WHERE id = $1',
        [agentId]
      );

      if (result.rows.length === 0) {
        logViolation(agentId, 'Agent not found in database', {
          action: 'validate_agent_state',
        });
        throw new Error(`Agent ${agentId} not found`);
      }

      const state = result.rows[0].state;

      if (state === AgentState.KILLED) {
        logViolation(agentId, 'Agent is in killed state', {
          state,
          action: 'validate_agent_state',
        });
        throw new Error(`Agent ${agentId} is killed`);
      }

      if (state === AgentState.PAUSED) {
        logViolation(agentId, 'Agent is in paused state', {
          state,
          action: 'validate_agent_state',
        });
        throw new Error(`Agent ${agentId} is paused`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('killed') || error.message.includes('paused'))) {
      throw error;
    }
    
    logViolation(agentId, 'Error validating agent state', {
      error: error instanceof Error ? error.message : String(error),
      action: 'validate_agent_state',
    });
    throw error;
  }
}

