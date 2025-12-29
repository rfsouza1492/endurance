# 🗑️ Componentes Removidos (Experimental)

Este documento lista os componentes que foram removidos para focar no MVP.

## 📋 Status dos Componentes

### ✅ Mantidos (Core MVP)

1. **Operating Doctrine Guard**
   - Localização: `src/doctrine/`
   - Status: ✅ Ativo
   - Uso: Middleware que bloqueia requests de agents `killed`

2. **LLM Gateway**
   - Localização: `src/llm/`
   - Status: ✅ Ativo (completar Week 2)
   - Features: Cache, providers, throttling, service

3. **Auth + Email**
   - Localização: `src/auth/`, `src/config/email.ts`
   - Status: ✅ Ativo
   - Features: Magic Link, JWT, Resend integration

### 🗑️ Removidos (Experimental)

1. **Notion Sync Agent**
   - Localização: ~~`src/agents/notion-sync-agent/`~~ (removido)
   - Status: 🗑️ Removido
   - Motivo: Não crítico para MVP
   - Rotas: `/notion-sync/*` removidas

2. **Guardian Agent**
   - Localização: ~~`src/guardian/`~~ (removido)
   - Status: 🗑️ Removido
   - Motivo: Pode ser background job depois

3. **MCP Integration**
   - Localização: ~~`src/notion/mcp*.ts`~~ (removido)
   - Status: 🗑️ Removido
   - Motivo: Feature futura
   - Nota: `src/notion/read.ts` e `src/notion/write.ts` simplificados para placeholders

## 🔄 Como Reimplementar (se necessário)

Os componentes foram completamente removidos. Para reimplementar:

1. **Notion Sync Agent**: Recriar a partir do histórico do Git (commit `ea7ba59`)
2. **Guardian Agent**: Recriar a partir do histórico do Git (commit `ea7ba59`)
3. **MCP Integration**: Recriar `src/notion/mcpClient.ts` e `src/notion/mcp.ts` do histórico do Git

## 📊 Endpoints Ativos

- `GET /health` - Health check
- `POST /api/v1/auth/login` - Magic link login
- `GET /api/v1/auth/verify` - Verify magic link
- `GET /api/v1/me` - Protected user info
- `GET /infra` - Infra overview
- `POST /llm-query` - LLM Gateway
- `GET /llm/health` - LLM health check

## 📊 Endpoints Removidos

- `POST /notion-sync/tasks` - 🗑️ Removido
- `GET /infra/infra-alerts` - 🗑️ Removido (dependia do Guardian)

## 🎯 Próximos Passos

1. Completar LLM Gateway v1 (Week 2)
2. Implementar API Backend completo (Week 3)
3. Reavaliar componentes pausados após MVP

