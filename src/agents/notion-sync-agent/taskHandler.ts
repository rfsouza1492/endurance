import { validateAgentState } from "../../doctrine";
import { appendAgentLog, createPage } from "../../notion/write";
import { Task } from "./taskQueue";
import { alertError, alertWarning } from "./guardianIntegration";

/**
 * Processa tarefas a serem registradas no Notion
 * @param agentId - ID do agente processando a tarefa
 * @param task - Tarefa a ser processada
 */
export async function handleTask(agentId: string, task: Task): Promise<void> {
  try {
    // Valida estado do agente antes de processar
    await validateAgentState(agentId);

    if (task.type === "log") {
      if (!task.pageId) {
        throw new Error("pageId is required for log tasks");
      }
      await appendAgentLog(agentId, task.pageId, task.content);
    } else if (task.type === "create") {
      await createPage(agentId, task.content, { 
        Status: { select: { name: "Concluída" } } 
      });
    } else {
      const errorMsg = `Tipo de tarefa desconhecida: ${(task as Task).type}`;
      await alertWarning(agentId, errorMsg, { task });
      throw new Error(errorMsg);
    }
  } catch (error) {
    // Envia alerta ao Guardian em caso de erro
    if (error instanceof Error && error.message.includes('killed')) {
      await alertError(agentId, 'Agent killed during task processing', { 
        taskId: task.id,
        taskType: task.type,
      });
    } else if (error instanceof Error && error.message.includes('paused')) {
      await alertWarning(agentId, 'Agent paused during task processing', { 
        taskId: task.id,
        taskType: task.type,
      });
    } else {
      await alertError(agentId, 'Task processing failed', { 
        taskId: task.id,
        taskType: task.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

