# Integração MCP com Notion

Este documento descreve a integração MCP (Model Context Protocol) com o Notion no Notion Sync Agent.

## Status Atual

⚠️ **IMPORTANTE**: A integração MCP está preparada mas requer implementação do cliente MCP real.

### O que está implementado:

1. ✅ **Wrapper MCP** (`src/notion/mcpClient.ts`)
   - Interface para usar ferramentas MCP do Notion
   - Fallback para placeholders quando MCP não está disponível
   - Logs estruturados de todas as operações

2. ✅ **Integração nas funções principais**
   - `appendAgentLog()` - Usa MCP se disponível
   - `createPage()` - Usa MCP se disponível
   - `readPage()` - Usa MCP se disponível
   - `getAgentLogPage()` - Usa MCP se disponível

3. ✅ **Sistema de fallback**
   - Se MCP não estiver disponível, usa placeholders
   - Configurável via variáveis de ambiente

## Configuração

### Variáveis de Ambiente

```bash
# Ativa uso do MCP (padrão: false)
USE_NOTION_MCP=true

# Permite fallback para placeholder se MCP falhar (padrão: true)
NOTION_MCP_FALLBACK=true
```

### Ferramentas MCP Disponíveis

O sistema está preparado para usar as seguintes ferramentas MCP do Notion:

1. **mcp_Notion_notion-create-pages**
   - Cria páginas no Notion
   - Usado por `createPage()`

2. **mcp_Notion_notion-update-page**
   - Atualiza páginas existentes
   - Usado por `appendAgentLog()`

3. **mcp_Notion_notion-fetch**
   - Busca uma página específica
   - Usado por `readPage()`

4. **mcp_Notion_notion-search**
   - Busca páginas no workspace
   - Usado por `getAgentLogPage()`

## Como Funciona

### Fluxo de Operação

```
Notion Sync Agent
    ↓
notion/write.ts ou notion/read.ts
    ↓
Verifica USE_NOTION_MCP
    ↓
    ├─ true → mcpClient.ts → MCP Tools
    └─ false → Placeholder (logs apenas)
```

### Exemplo: Criar Página

```typescript
// Em notion/write.ts
export async function createPage(...) {
  if (process.env.USE_NOTION_MCP === 'true') {
    // Usa MCP
    return await createPageMCP(title, content, properties);
  } else {
    // Usa placeholder
    return `page-${Date.now()}-...`;
  }
}
```

## Implementação do Cliente MCP Real

Para usar MCP em produção, você precisa:

1. **Instalar cliente MCP**
   ```bash
   npm install @modelcontextprotocol/sdk
   ```

2. **Configurar conexão MCP**
   - O servidor MCP do Notion deve estar configurado
   - Verificar arquivo `~/.cursor/mcp.json` ou similar

3. **Implementar cliente em `mcpClient.ts`**
   ```typescript
   import { Client } from '@modelcontextprotocol/sdk/client/index.js';
   
   const mcpClient = new Client({
     name: 'notion-sync-agent',
     version: '1.0.0',
   });
   
   await mcpClient.connect({
     transport: ... // Configurar transporte MCP
   });
   ```

## Uso Atual (Placeholder)

Atualmente, o sistema funciona em modo placeholder:

- ✅ Todas as operações são logadas
- ✅ Tarefas são processadas normalmente
- ✅ Fila funciona corretamente
- ⚠️ Não cria/atualiza páginas reais no Notion

## Próximos Passos

1. **Implementar cliente MCP real**
   - Conectar ao servidor MCP do Notion
   - Implementar chamadas reais às ferramentas

2. **Testes de integração**
   - Testar criação de páginas
   - Testar atualização de páginas
   - Testar busca de páginas

3. **Tratamento de erros**
   - Melhorar fallback em caso de falha
   - Retry logic para operações MCP

## Notas

- As ferramentas MCP estão disponíveis no contexto do assistente Cursor
- Para uso em produção, é necessário um cliente MCP que se conecte ao servidor
- O sistema está preparado para funcionar com ou sem MCP

