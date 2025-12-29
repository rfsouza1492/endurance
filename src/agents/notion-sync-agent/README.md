# Notion Sync Agent

Agent responsável por sincronizar tarefas e eventos dos outros agents com o Notion, centralizando documentação e logs.

## Fluxo de Integração

```
Data Lab Agent → LLM Gateway Agent → Infra Agent
                    ↓
            Notion Sync Agent
                    ↓
                Notion
                    ↓
               Guardian
```

## Funcionalidades

- ✅ Recebe tarefas de outros agents via API
- ✅ Processa tarefas em fila (banco de dados)
- ✅ Valida estado do agente antes de processar
- ✅ Envia alertas ao Guardian em caso de erros
- ✅ Logs estruturados em JSON
- ✅ Suporte a prioridades (low, normal, high)

## Como Outros Agents Enviam Tarefas

### Exemplo: Data Lab Agent

```typescript
import http from 'http';

async function sendTaskToNotionSync(task: {
  type: 'log' | 'create';
  content: string;
  pageId?: string;
  priority?: 'low' | 'normal' | 'high';
}) {
  const postData = JSON.stringify(task);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/notion-sync/tasks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-id': 'data-lab-001',
      'x-agent-state': 'active',
    },
  };

  const req = http.request(options, (res) => {
    // Tarefa enfileirada com sucesso
  });

  req.write(postData);
  req.end();
}

// Exemplo: Log de análise
await sendTaskToNotionSync({
  type: 'log',
  pageId: 'PAGE_ID_ANALISES',
  content: 'Análise de dados concluída: 1500 registros processados',
  priority: 'normal',
});

// Exemplo: Criar página de decisão
await sendTaskToNotionSync({
  type: 'create',
  content: 'Decisão: Implementar cache Redis para melhorar performance',
  priority: 'high',
});
```

## Estrutura de Tarefas

### Tipo: `log`
Anexa um log a uma página existente no Notion.

```json
{
  "type": "log",
  "content": "Mensagem do log",
  "pageId": "notion-page-id",
  "priority": "normal",
  "metadata": {
    "source": "data-lab",
    "analysisId": "123"
  }
}
```

### Tipo: `create`
Cria uma nova página no Notion.

```json
{
  "type": "create",
  "content": "Título da página",
  "priority": "high",
  "metadata": {
    "category": "decision",
    "tags": ["infra", "critical"]
  }
}
```

## Configuração

Variáveis de ambiente:

- `NOTION_SYNC_POLL_INTERVAL_MS`: Intervalo de polling (padrão: 30000ms)
- `NOTION_SYNC_BATCH_SIZE`: Tamanho do lote de tarefas (padrão: 10)
- `ENGINE_ROOM_URL`: URL do Engine Room para alertas (padrão: http://localhost:3000)

## Migration SQL

Execute a migration para criar a tabela de fila:

```bash
psql $DATABASE_URL -f migrations/001_create_notion_sync_tasks.sql
```

## Monitoramento

O agent envia alertas ao Guardian em caso de:
- Erros ao processar tarefas
- Agent morto ou pausado
- Falhas na fila de tarefas

## Logs Estruturados

Todos os logs são em JSON:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "agentId": "notion-sync-001",
  "action": "task_processed",
  "details": {
    "taskId": "uuid",
    "type": "log",
    "sourceAgentId": "data-lab-001"
  }
}
```

