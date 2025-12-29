import pool from '../config/database';
import { AgentState } from '../doctrine/states';
import { logViolation, DoctrineViolation } from '../doctrine/violations';
import http from 'http';
import https from 'https';
import { URL } from 'url';

interface Agent {
  id: string;
  state: string;
  [key: string]: unknown;
}

interface Alert {
  timestamp: string;
  type: 'agent_killed' | 'agent_misbehaving';
  agentId: string;
  details: Record<string, unknown>;
}

interface CycleSummary {
  timestamp: string;
  cycleId: string;
  agentsChecked: number;
  violations: DoctrineViolation[];
  alerts: Alert[];
}

const POLL_INTERVAL_MS = parseInt(process.env.GUARDIAN_POLL_INTERVAL_MS || '30000', 10);
const ENGINE_ROOM_URL = process.env.ENGINE_ROOM_URL || 'http://localhost:3000';

let cycleCounter = 0;

const logJSON = (data: unknown): void => {
  console.log(JSON.stringify(data, null, 2));
};

const sendAlert = async (alert: Alert): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const url = new URL(`${ENGINE_ROOM_URL}/infra-alerts`);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const postData = JSON.stringify(alert);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = httpModule.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          logJSON({
            timestamp: new Date().toISOString(),
            error: 'Failed to send alert to Engine Room',
            status: res.statusCode,
            alert,
          });
          resolve();
        }
      });

      req.on('error', (error) => {
        logJSON({
          timestamp: new Date().toISOString(),
          error: 'Error sending alert to Engine Room',
          message: error.message,
          alert,
        });
        resolve();
      });

      req.write(postData);
      req.end();
    } catch (error) {
      logJSON({
        timestamp: new Date().toISOString(),
        error: 'Error sending alert to Engine Room',
        message: error instanceof Error ? error.message : String(error),
        alert,
      });
      resolve();
    }
  });
};

const monitorAgents = async (): Promise<CycleSummary> => {
  const cycleId = `cycle-${++cycleCounter}`;
  const violations: DoctrineViolation[] = [];
  const alerts: Alert[] = [];
  let agentsChecked = 0;

  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query<Agent>(
        'SELECT id, state FROM agents ORDER BY id'
      );

      const agents = result.rows;
      agentsChecked = agents.length;
      
      for (const agent of agents) {
        const agentId = agent.id;
        const state = agent.state;

        if (state === AgentState.KILLED) {
          const violation: DoctrineViolation = {
            timestamp: new Date().toISOString(),
            agentId,
            violation: 'Agent is in killed state',
            details: {
              state,
              cycleId,
            },
          };

          violations.push(violation);
          logViolation(agentId, 'Agent is in killed state', {
            state,
            cycleId,
          });

          const alert: Alert = {
            timestamp: new Date().toISOString(),
            type: 'agent_killed',
            agentId,
            details: {
              state,
              cycleId,
            },
          };

          alerts.push(alert);
          await sendAlert(alert);
        } else if (state === AgentState.PAUSED) {
          logJSON({
            timestamp: new Date().toISOString(),
            agentId,
            state: 'paused',
            action: 'monitoring',
            cycleId,
          });
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logJSON({
      timestamp: new Date().toISOString(),
      error: 'Error monitoring agents',
      message: error instanceof Error ? error.message : String(error),
      cycleId,
    });
  }

  const summary: CycleSummary = {
    timestamp: new Date().toISOString(),
    cycleId,
    agentsChecked,
    violations,
    alerts,
  };

  if (violations.length > 0 || alerts.length > 0) {
    logJSON({
      type: 'cycle_summary',
      ...summary,
    });
  }

  return summary;
};

export const startGuardian = (): void => {
  logJSON({
    timestamp: new Date().toISOString(),
    service: 'Endurance-Agent-Guardian',
    status: 'started',
    pollIntervalMs: POLL_INTERVAL_MS,
    engineRoomUrl: ENGINE_ROOM_URL,
  });

  const runCycle = async (): Promise<void> => {
    await monitorAgents();
    setTimeout(runCycle, POLL_INTERVAL_MS);
  };

  runCycle();
};

