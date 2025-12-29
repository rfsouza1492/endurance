/**
 * Notifier - Logs estruturados para o Notion Sync Agent
 */

export interface LogDetails {
  [key: string]: unknown;
}

/**
 * Log estruturado em JSON
 * @param action - Ação sendo executada
 * @param agentId - ID do agente
 * @param details - Detalhes adicionais do log
 */
export function log(action: string, agentId: string, details: LogDetails = {}): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    agentId,
    action,
    details,
  }));
}

