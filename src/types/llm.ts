export interface LLMRequest {
  prompt: string;
  agentId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useCache?: boolean;
}

export interface LLMResponse {
  response: string;
  model: string;
  provider: 'openai' | 'oss';
  cached: boolean;
  tokensUsed?: number;
  timestamp: string;
}

export interface LLMLog {
  timestamp: string;
  type: 'llm_request' | 'llm_response' | 'llm_error' | 'llm_cache_hit' | 'llm_cache_miss' | 'llm_fallback';
  agentId?: string;
  requestId: string;
  prompt?: string;
  response?: string;
  model?: string;
  provider?: 'openai' | 'oss';
  cached?: boolean;
  error?: string;
  tokensUsed?: number;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface CacheEntry {
  prompt: string;
  response: string;
  model: string;
  provider: 'openai' | 'oss';
  timestamp: string;
  expiresAt: number;
}

export interface ThrottleConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
}

