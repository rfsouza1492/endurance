import { handleTask } from "./taskHandler";
import { log } from "./notifier";
import { 
  getPendingTasks, 
  markTaskProcessing, 
  markTaskCompleted, 
  markTaskFailed,
  Task 
} from "./taskQueue";
import { alertError } from "./guardianIntegration";

const AGENT_ID = "notion-sync-001";
const POLL_INTERVAL_MS = parseInt(process.env.NOTION_SYNC_POLL_INTERVAL_MS || "30000", 10);
const TASKS_BATCH_SIZE = parseInt(process.env.NOTION_SYNC_BATCH_SIZE || "10", 10);

/**
 * Processa tarefas da fila
 */
async function processTasks(): Promise<void> {
  try {
    // Busca tarefas pendentes da fila
    const tasks = await getPendingTasks(TASKS_BATCH_SIZE);
    
    if (tasks.length === 0) {
      return; // Nenhuma tarefa pendente
    }

    log("tasks_fetched", AGENT_ID, { 
      count: tasks.length 
    });

    // Processa cada tarefa
    for (const task of tasks) {
      try {
        // Marca como processando
        if (task.id) {
          await markTaskProcessing(task.id);
        }

        // Processa a tarefa
        await handleTask(AGENT_ID, task);

        // Marca como concluída
        if (task.id) {
          await markTaskCompleted(task.id);
        }

        log("task_processed", AGENT_ID, { 
          taskId: task.id,
          type: task.type,
          sourceAgentId: task.sourceAgentId,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Marca como falha
        if (task.id) {
          await markTaskFailed(task.id, errorMessage);
        }

        log("task_error", AGENT_ID, { 
          taskId: task.id,
          task,
          error: errorMessage,
        });

        // Alerta ao Guardian já é enviado pelo handleTask
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    log("poll_error", AGENT_ID, { 
      error: errorMessage,
    });

    // Alerta crítico ao Guardian
    await alertError(AGENT_ID, 'Failed to process task queue', {
      error: errorMessage,
    });
  }
}

/**
 * Inicia o Notion Sync Agent
 */
export function startNotionSyncAgent(): void {
  log("agent_started", AGENT_ID, { 
    pollIntervalMs: POLL_INTERVAL_MS,
    batchSize: TASKS_BATCH_SIZE,
  });

  // Processa tarefas imediatamente
  processTasks();

  // Polling periódico
  setInterval(processTasks, POLL_INTERVAL_MS);
}

// Auto-start se executado diretamente
if (require.main === module) {
  startNotionSyncAgent();
}

