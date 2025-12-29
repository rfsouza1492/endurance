-- Migration: Create notion_sync_tasks table
-- Description: Tabela para fila de tarefas do Notion Sync Agent

CREATE TABLE IF NOT EXISTS notion_sync_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('log', 'create')),
  content TEXT NOT NULL,
  page_id VARCHAR(255),
  source_agent_id VARCHAR(255) NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT log_task_requires_page_id CHECK (
    (type = 'log' AND page_id IS NOT NULL) OR 
    (type = 'create')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notion_sync_tasks_status ON notion_sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_notion_sync_tasks_created_at ON notion_sync_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_notion_sync_tasks_source_agent ON notion_sync_tasks(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_notion_sync_tasks_priority_status ON notion_sync_tasks(priority, status);

-- Índice composto para queries de tarefas pendentes ordenadas
CREATE INDEX IF NOT EXISTS idx_notion_sync_tasks_pending ON notion_sync_tasks(status, priority, created_at) 
WHERE status = 'pending';

COMMENT ON TABLE notion_sync_tasks IS 'Fila de tarefas para o Notion Sync Agent processar';
COMMENT ON COLUMN notion_sync_tasks.type IS 'Tipo de tarefa: log (append) ou create (nova página)';
COMMENT ON COLUMN notion_sync_tasks.content IS 'Conteúdo da tarefa (log entry ou título da página)';
COMMENT ON COLUMN notion_sync_tasks.page_id IS 'ID da página Notion (obrigatório para tipo log)';
COMMENT ON COLUMN notion_sync_tasks.source_agent_id IS 'ID do agent que criou a tarefa';
COMMENT ON COLUMN notion_sync_tasks.priority IS 'Prioridade da tarefa: low, normal, high';
COMMENT ON COLUMN notion_sync_tasks.metadata IS 'Metadados adicionais da tarefa em JSON';
COMMENT ON COLUMN notion_sync_tasks.status IS 'Status da tarefa: pending, processing, completed, failed';

