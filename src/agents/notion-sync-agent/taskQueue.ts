import pool from "../../config/database";

export interface Task {
  id?: string;
  type: "log" | "create";
  content: string;
  pageId?: string;
  sourceAgentId: string;
  priority?: "low" | "normal" | "high";
  metadata?: Record<string, unknown>;
  createdAt?: string;
  processedAt?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

/**
 * Adiciona uma tarefa à fila
 * @param task - Tarefa a ser adicionada
 * @returns ID da tarefa criada
 */
export async function enqueueTask(task: Omit<Task, "id" | "createdAt" | "status">): Promise<string> {
  const client = await pool.connect();
  
  try {
    const result = await client.query<{ id: string }>(
      `INSERT INTO notion_sync_tasks 
       (type, content, page_id, source_agent_id, priority, metadata, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        task.type,
        task.content,
        task.pageId || null,
        task.sourceAgentId,
        task.priority || "normal",
        JSON.stringify(task.metadata || {}),
        "pending",
      ]
    );
    
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Busca tarefas pendentes da fila
 * @param limit - Número máximo de tarefas a retornar
 * @returns Array de tarefas pendentes
 */
export async function getPendingTasks(limit: number = 10): Promise<Task[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query<Task>(
      `SELECT 
        id,
        type,
        content,
        page_id as "pageId",
        source_agent_id as "sourceAgentId",
        priority,
        metadata,
        created_at as "createdAt",
        processed_at as "processedAt",
        status
       FROM notion_sync_tasks
       WHERE status = 'pending'
       ORDER BY 
         CASE priority
           WHEN 'high' THEN 1
           WHEN 'normal' THEN 2
           WHEN 'low' THEN 3
         END,
         created_at ASC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    }));
  } finally {
    client.release();
  }
}

/**
 * Marca uma tarefa como processando
 * @param taskId - ID da tarefa
 */
export async function markTaskProcessing(taskId: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query(
      `UPDATE notion_sync_tasks 
       SET status = 'processing', processed_at = NOW()
       WHERE id = $1`,
      [taskId]
    );
  } finally {
    client.release();
  }
}

/**
 * Marca uma tarefa como concluída
 * @param taskId - ID da tarefa
 */
export async function markTaskCompleted(taskId: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query(
      `UPDATE notion_sync_tasks 
       SET status = 'completed', processed_at = NOW()
       WHERE id = $1`,
      [taskId]
    );
  } finally {
    client.release();
  }
}

/**
 * Marca uma tarefa como falha
 * @param taskId - ID da tarefa
 * @param error - Mensagem de erro
 */
export async function markTaskFailed(taskId: string, error: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query(
      `UPDATE notion_sync_tasks 
       SET status = 'failed', 
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
           processed_at = NOW()
       WHERE id = $1`,
      [taskId, JSON.stringify(error)]
    );
  } finally {
    client.release();
  }
}

