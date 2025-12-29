-- ==========================================
-- Endurance OS - Schema SQL v2 Canonical
-- ==========================================

-- Drop tables if exist (para desenvolvimento)
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS infra_usage CASCADE;
DROP TABLE IF EXISTS infra_components CASCADE;
DROP TABLE IF EXISTS agent_events CASCADE;
DROP TABLE IF EXISTS llm_usage CASCADE;
DROP TABLE IF EXISTS prompt_registry CASCADE;
DROP TABLE IF EXISTS agent_routing CASCADE;
DROP TABLE IF EXISTS llm_models CASCADE;
DROP TABLE IF EXISTS llm_providers CASCADE;
DROP TABLE IF EXISTS decision_gates CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS ventures CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS weekly_summaries CASCADE;

-- ==========================================
-- 1. users
-- ==========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'captain',
  auth_token_hash VARCHAR(255),
  auth_token_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ==========================================
-- 2. ventures
-- ==========================================
CREATE TABLE ventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  thesis TEXT NOT NULL,
  
  -- ICP
  icp_defined BOOLEAN NOT NULL DEFAULT false,
  icp_description TEXT,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'discovery',
  -- discovery | build | live | paused | killed
  
  -- Governança (OBRIGATÓRIO)
  ttl_weeks INTEGER NOT NULL CHECK (ttl_weeks BETWEEN 1 AND 12),
  weeks_active INTEGER NOT NULL DEFAULT 0,
  budget_usd DECIMAL(10,2) NOT NULL CHECK (budget_usd > 0),
  spent_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  
  -- Kill rules (JSONB array, mínimo 3)
  kill_rules JSONB NOT NULL DEFAULT '[]',
  
  -- Timestamps
  activated_at TIMESTAMP,
  killed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Dono
  owner_id UUID NOT NULL REFERENCES users(id),
  
  -- Constraints (ENFORCEMENT)
  CONSTRAINT ttl_positive CHECK (ttl_weeks > 0),
  CONSTRAINT budget_positive CHECK (budget_usd > 0),
  CONSTRAINT spent_within_limit CHECK (spent_usd <= budget_usd * 2),
  CONSTRAINT icp_required_for_build CHECK (
    status != 'build' OR icp_defined = true
  ),
  CONSTRAINT kill_rules_minimum CHECK (
    jsonb_array_length(kill_rules) >= 3
  )
);

CREATE INDEX idx_ventures_status ON ventures(status);
CREATE INDEX idx_ventures_owner ON ventures(owner_id);
CREATE INDEX idx_ventures_ttl ON ventures(ttl_weeks, weeks_active);
CREATE INDEX idx_ventures_slug ON ventures(slug);

-- ==========================================
-- 3. agents
-- ==========================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  agent_id VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(100) NOT NULL,
  -- strategy | data_lab | infra_ops | venture_studio | venture_ops | kill_risk
  
  -- Missão (OBRIGATÓRIO)
  mission TEXT NOT NULL,
  success_metric TEXT NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'standby',
  -- standby | calibrating | active | paused | archived
  
  -- Relações
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  
  -- Governança (OBRIGATÓRIO)
  ttl_weeks INTEGER NOT NULL CHECK (ttl_weeks BETWEEN 1 AND 8),
  weeks_active INTEGER NOT NULL DEFAULT 0,
  budget_usd DECIMAL(10,2) NOT NULL CHECK (budget_usd > 0),
  spent_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  
  -- Constitution & Kill rules (OBRIGATÓRIO)
  constitution TEXT NOT NULL,
  kill_rules JSONB NOT NULL DEFAULT '[]',
  
  -- Output tracking
  last_output_at TIMESTAMP,
  weeks_without_output INTEGER NOT NULL DEFAULT 0,
  failed_outputs_streak INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  activated_at TIMESTAMP,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Dono
  owner_id UUID NOT NULL REFERENCES users(id),
  
  -- Constraints (ENFORCEMENT)
  CONSTRAINT ttl_positive CHECK (ttl_weeks > 0),
  CONSTRAINT budget_positive CHECK (budget_usd > 0),
  CONSTRAINT spent_within_limit CHECK (spent_usd <= budget_usd * 2),
  CONSTRAINT kill_rules_minimum CHECK (
    jsonb_array_length(kill_rules) >= 3
  ),
  CONSTRAINT auto_kill_no_output CHECK (
    weeks_without_output < 2 OR status = 'archived'
  ),
  CONSTRAINT auto_kill_ttl CHECK (
    weeks_active <= ttl_weeks OR status = 'archived'
  )
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_venture ON agents(venture_id);
CREATE INDEX idx_agents_role ON agents(role);
CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_ttl ON agents(ttl_weeks, weeks_active);
CREATE INDEX idx_agents_output ON agents(last_output_at);

-- ==========================================
-- 4. logs
-- ==========================================
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo
  log_type VARCHAR(50) NOT NULL,
  -- weekly_agent | weekly_venture | incident | learning | decision
  
  -- Relações
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  
  -- Conteúdo
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Imutabilidade (ENFORCEMENT)
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMP,
  locked_by_gate_id UUID,
  
  -- Timestamps
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Autor
  author_id UUID NOT NULL REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT log_entity_required CHECK (
    agent_id IS NOT NULL OR venture_id IS NOT NULL
  ),
  CONSTRAINT week_range_valid CHECK (week_end > week_start)
);

CREATE INDEX idx_logs_agent ON logs(agent_id);
CREATE INDEX idx_logs_venture ON logs(venture_id);
CREATE INDEX idx_logs_week ON logs(week_start, week_end);
CREATE INDEX idx_logs_locked ON logs(locked);
CREATE INDEX idx_logs_type ON logs(log_type);

-- Trigger: impedir edição de logs travados
CREATE OR REPLACE FUNCTION prevent_locked_log_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked = true THEN
    RAISE EXCEPTION 'Cannot edit locked log. Log ID: %', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_locked_log_edit
BEFORE UPDATE ON logs
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_log_edit();

-- ==========================================
-- 5. decision_gates
-- ==========================================
CREATE TABLE decision_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo
  gate_type VARCHAR(50) NOT NULL,
  -- activation | weekly | monthly_kill | ttl_expiry | budget_breach | auto_kill
  
  -- Relações
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  log_id UUID REFERENCES logs(id),
  
  -- Estado antes do gate
  status_before VARCHAR(50) NOT NULL,
  ttl_remaining INTEGER NOT NULL,
  budget_variance_pct DECIMAL(5,2) NOT NULL,
  weeks_without_output INTEGER DEFAULT 0,
  
  -- Alertas
  alerts JSONB DEFAULT '[]',
  kill_rules_violated JSONB DEFAULT '[]',
  
  -- Análise
  what_worked TEXT,
  what_failed TEXT,
  learnings TEXT,
  blockers TEXT,
  
  -- Proposta
  recommendation VARCHAR(10) NOT NULL,
  -- KEEP | FIX | KILL | APPROVE | REJECT
  recommendation_reason TEXT NOT NULL,
  
  -- Decisão final (preenchido pelo humano)
  decision VARCHAR(10),
  -- KEEP | FIX | KILL | APPROVE | REJECT
  decided_at TIMESTAMP,
  decided_by UUID REFERENCES users(id),
  signature VARCHAR(10),
  
  -- Ações
  actions JSONB DEFAULT '[]',
  next_gate_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT gate_entity_required CHECK (
    agent_id IS NOT NULL OR venture_id IS NOT NULL
  ),
  CONSTRAINT decision_requires_decider CHECK (
    decision IS NULL OR decided_by IS NOT NULL
  ),
  CONSTRAINT recommendation_valid CHECK (
    recommendation IN ('KEEP', 'FIX', 'KILL', 'APPROVE', 'REJECT')
  ),
  CONSTRAINT decision_valid CHECK (
    decision IS NULL OR 
    decision IN ('KEEP', 'FIX', 'KILL', 'APPROVE', 'REJECT')
  )
);

CREATE INDEX idx_gates_agent ON decision_gates(agent_id);
CREATE INDEX idx_gates_venture ON decision_gates(venture_id);
CREATE INDEX idx_gates_type ON decision_gates(gate_type);
CREATE INDEX idx_gates_decision ON decision_gates(decision);
CREATE INDEX idx_gates_pending ON decision_gates(decided_at) WHERE decided_at IS NULL;

-- Trigger: travar log automaticamente após decisão
CREATE OR REPLACE FUNCTION lock_log_after_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.decided_at IS NOT NULL AND NEW.log_id IS NOT NULL THEN
    UPDATE logs
    SET 
      locked = true,
      locked_at = NEW.decided_at,
      locked_by_gate_id = NEW.id
    WHERE id = NEW.log_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lock_log_after_gate
AFTER UPDATE ON decision_gates
FOR EACH ROW
EXECUTE FUNCTION lock_log_after_gate();

-- ==========================================
-- 6. llm_providers
-- ==========================================
CREATE TABLE llm_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('openai', 'oss', 'custom')),
  base_url TEXT,
  api_key_encrypted TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_providers_type ON llm_providers(type);
CREATE INDEX idx_llm_providers_active ON llm_providers(active);

-- ==========================================
-- 7. llm_models
-- ==========================================
CREATE TABLE llm_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(100),
  context_limit INTEGER NOT NULL,
  cost_per_1k_input_tokens DECIMAL(10,6),
  cost_per_1k_output_tokens DECIMAL(10,6),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_models_provider ON llm_models(provider_id);
CREATE INDEX idx_llm_models_active ON llm_models(active);

-- ==========================================
-- 8. agent_routing
-- ==========================================
CREATE TABLE agent_routing (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  primary_model_id UUID NOT NULL REFERENCES llm_models(id),
  fallback_model_id UUID REFERENCES llm_models(id),
  max_cost_per_day DECIMAL(10,2) NOT NULL,
  max_calls_per_hour INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_routing_primary ON agent_routing(primary_model_id);
CREATE INDEX idx_agent_routing_fallback ON agent_routing(fallback_model_id);

-- ==========================================
-- 9. prompt_registry
-- ==========================================
CREATE TABLE prompt_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT version_positive CHECK (version > 0),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_prompt_registry_agent ON prompt_registry(agent_id);
CREATE INDEX idx_prompt_registry_active ON prompt_registry(agent_id, active) WHERE active = true;

-- ==========================================
-- 10. llm_usage
-- ==========================================
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES llm_models(id),
  
  -- Métricas
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd DECIMAL(10,4) NOT NULL,
  
  -- Cache
  cached BOOLEAN NOT NULL DEFAULT false,
  cache_hit_type VARCHAR(50), -- semantic | deterministic
  
  -- Metadata
  latency_ms INTEGER,
  fallback_triggered BOOLEAN NOT NULL DEFAULT false,
  error_occurred BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  week_start DATE NOT NULL,
  
  CONSTRAINT tokens_positive CHECK (input_tokens >= 0 AND output_tokens >= 0),
  CONSTRAINT cost_non_negative CHECK (cost_usd >= 0)
);

CREATE INDEX idx_llm_usage_agent ON llm_usage(agent_id);
CREATE INDEX idx_llm_usage_model ON llm_usage(model_id);
CREATE INDEX idx_llm_usage_week ON llm_usage(week_start);
CREATE INDEX idx_llm_usage_cached ON llm_usage(cached);
CREATE INDEX idx_llm_usage_created ON llm_usage(created_at);

-- ==========================================
-- 11. agent_events
-- ==========================================
CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  -- activated | paused | archived | output_generated | cost_exceeded | ttl_warning
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_events_agent ON agent_events(agent_id);
CREATE INDEX idx_agent_events_type ON agent_events(event_type);
CREATE INDEX idx_agent_events_created ON agent_events(created_at);

-- ==========================================
-- 12. infra_components
-- ==========================================
CREATE TABLE infra_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  -- llm | api | cache | database | storage
  provider VARCHAR(255),
  monthly_cost_estimate DECIMAL(10,2),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  -- active | degraded | failed
  killable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_infra_components_type ON infra_components(type);
CREATE INDEX idx_infra_components_status ON infra_components(status);

-- ==========================================
-- 13. infra_usage
-- ==========================================
CREATE TABLE infra_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relações
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES infra_components(id),
  
  -- Métricas
  quantity INTEGER NOT NULL DEFAULT 1,
  cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  week_start DATE NOT NULL,
  
  CONSTRAINT usage_entity_required CHECK (
    agent_id IS NOT NULL OR venture_id IS NOT NULL
  ),
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT cost_non_negative CHECK (cost_usd >= 0)
);

CREATE INDEX idx_infra_usage_agent ON infra_usage(agent_id);
CREATE INDEX idx_infra_usage_venture ON infra_usage(venture_id);
CREATE INDEX idx_infra_usage_component ON infra_usage(component_id);
CREATE INDEX idx_infra_usage_week ON infra_usage(week_start);
CREATE INDEX idx_infra_usage_cost ON infra_usage(cost_usd);

-- ==========================================
-- 14. incidents
-- ==========================================
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES infra_components(id),
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  -- open | investigating | resolved
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  postmortem TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_component ON incidents(component_id);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_detected ON incidents(detected_at);

-- ==========================================
-- 15. experiments
-- ==========================================
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  hypothesis TEXT NOT NULL,
  outcome VARCHAR(50) CHECK (outcome IN ('success', 'neutral', 'fail', 'pending')),
  learnings TEXT,
  transferable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_experiments_venture ON experiments(venture_id);
CREATE INDEX idx_experiments_outcome ON experiments(outcome);
CREATE INDEX idx_experiments_transferable ON experiments(transferable);

-- ==========================================
-- 16. weekly_summaries
-- ==========================================
CREATE TABLE weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Cost metrics
  total_cost_usd DECIMAL(10,2) NOT NULL,
  llm_cost_usd DECIMAL(10,2) NOT NULL,
  infra_cost_usd DECIMAL(10,2) NOT NULL,
  
  -- Volume metrics
  total_llm_calls INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cache_hit_rate DECIMAL(5,2),
  fallback_rate DECIMAL(5,2),
  
  -- Agent metrics
  active_agents_count INTEGER NOT NULL,
  agents_with_output INTEGER NOT NULL,
  
  -- Venture metrics
  active_ventures_count INTEGER NOT NULL,
  
  -- Gates & decisions
  gates_decided INTEGER NOT NULL,
  agents_killed INTEGER NOT NULL,
  ventures_killed INTEGER NOT NULL,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(week_start)
);

CREATE INDEX idx_weekly_summaries_week ON weekly_summaries(week_start DESC);

-- ==========================================
-- VIEWS
-- ==========================================

-- Active Entities
CREATE VIEW active_entities AS
SELECT 
  'venture' as entity_type,
  id,
  name as entity_name,
  status,
  ttl_weeks,
  weeks_active,
  budget_usd,
  spent_usd
FROM ventures
WHERE status IN ('discovery', 'build', 'live')

UNION ALL

SELECT 
  'agent' as entity_type,
  id,
  name as entity_name,
  status,
  ttl_weeks,
  weeks_active,
  budget_usd,
  spent_usd
FROM agents
WHERE status IN ('standby', 'calibrating', 'active')

ORDER BY entity_type, entity_name;

-- Pending Gates
CREATE VIEW pending_gates AS
SELECT 
  dg.id,
  dg.gate_type,
  dg.created_at,
  COALESCE(a.name, v.name) as entity_name,
  CASE 
    WHEN a.id IS NOT NULL THEN 'agent'
    WHEN v.id IS NOT NULL THEN 'venture'
  END as entity_type,
  dg.recommendation,
  dg.alerts
FROM decision_gates dg
LEFT JOIN agents a ON dg.agent_id = a.id
LEFT JOIN ventures v ON dg.venture_id = v.id
WHERE dg.decided_at IS NULL
ORDER BY dg.created_at ASC;

-- TTL Expiry Alerts
CREATE VIEW ttl_expiry_alerts AS
SELECT 
  'agent' as entity_type,
  id,
  name,
  ttl_weeks,
  weeks_active,
  (ttl_weeks - weeks_active) as weeks_remaining
FROM agents
WHERE 
  status = 'active' AND
  (ttl_weeks - weeks_active) <= 1

UNION ALL

SELECT 
  'venture' as entity_type,
  id,
  name,
  ttl_weeks,
  weeks_active,
  (ttl_weeks - weeks_active) as weeks_remaining
FROM ventures
WHERE 
  status IN ('discovery', 'build', 'live') AND
  (ttl_weeks - weeks_active) <= 1

ORDER BY weeks_remaining ASC;

-- Budget Breach Alerts
CREATE VIEW budget_breach_alerts AS
SELECT 
  'agent' as entity_type,
  id,
  name,
  budget_usd,
  spent_usd,
  ROUND(((spent_usd - budget_usd) / budget_usd * 100)::NUMERIC, 2) as variance_pct
FROM agents
WHERE 
  status = 'active' AND
  spent_usd > budget_usd * 1.5

UNION ALL

SELECT 
  'venture' as entity_type,
  id,
  name,
  budget_usd,
  spent_usd,
  ROUND(((spent_usd - budget_usd) / budget_usd * 100)::NUMERIC, 2) as variance_pct
FROM ventures
WHERE 
  status IN ('discovery', 'build', 'live') AND
  spent_usd > budget_usd * 1.5

ORDER BY variance_pct DESC;

-- ==========================================
-- SEED DATA
-- ==========================================

-- Criar user captain
INSERT INTO users (email, name, role)
VALUES ('rafael@endurance.build', 'Rafael Ferreira Souza', 'captain')
ON CONFLICT (email) DO NOTHING;

-- Criar LLM providers
INSERT INTO llm_providers (name, type, base_url, active)
VALUES 
  ('OpenAI', 'openai', 'https://api.openai.com/v1', true),
  ('Together AI', 'oss', 'https://api.together.xyz/v1', true)
ON CONFLICT DO NOTHING;

-- Criar LLM models
INSERT INTO llm_models (provider_id, name, version, context_limit, cost_per_1k_input_tokens, cost_per_1k_output_tokens, active)
SELECT 
  p.id,
  'gpt-4o-mini',
  '2024-07-18',
  128000,
  0.00015,
  0.0006,
  true
FROM llm_providers p
WHERE p.name = 'OpenAI'
ON CONFLICT DO NOTHING;

INSERT INTO llm_models (provider_id, name, version, context_limit, cost_per_1k_input_tokens, cost_per_1k_output_tokens, active)
SELECT 
  p.id,
  'meta-llama/Llama-3.1-8B-Instruct-Turbo',
  'v3.1',
  128000,
  0.00006,
  0.00006,
  true
FROM llm_providers p
WHERE p.name = 'Together AI'
ON CONFLICT DO NOTHING;

-- ==========================================
-- FIM
-- ==========================================

