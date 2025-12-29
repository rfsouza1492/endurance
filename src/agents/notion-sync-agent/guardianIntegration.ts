import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface GuardianAlert {
  timestamp: string;
  type: 'notion_sync_error' | 'notion_sync_warning' | 'notion_sync_info';
  agentId: string;
  details: Record<string, unknown>;
}

const ENGINE_ROOM_URL = process.env.ENGINE_ROOM_URL || 'http://localhost:3000';

/**
 * Envia alerta ao Guardian
 * @param alert - Alerta a ser enviado
 */
export async function sendAlertToGuardian(alert: GuardianAlert): Promise<void> {
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
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            error: 'Failed to send alert to Guardian',
            status: res.statusCode,
            alert,
          }));
          resolve();
        }
      });

      req.on('error', (error) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          error: 'Error sending alert to Guardian',
          message: error.message,
          alert,
        }));
        resolve();
      });

      req.write(postData);
      req.end();
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: 'Error sending alert to Guardian',
        message: error instanceof Error ? error.message : String(error),
        alert,
      }));
      resolve();
    }
  });
}

/**
 * Cria e envia alerta de erro
 */
export async function alertError(
  agentId: string,
  error: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const alert: GuardianAlert = {
    timestamp: new Date().toISOString(),
    type: 'notion_sync_error',
    agentId,
    details: {
      error,
      ...details,
    },
  };
  
  await sendAlertToGuardian(alert);
}

/**
 * Cria e envia alerta de aviso
 */
export async function alertWarning(
  agentId: string,
  warning: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const alert: GuardianAlert = {
    timestamp: new Date().toISOString(),
    type: 'notion_sync_warning',
    agentId,
    details: {
      warning,
      ...details,
    },
  };
  
  await sendAlertToGuardian(alert);
}

