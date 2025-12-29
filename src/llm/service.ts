import { LLMRequest, LLMResponse, LLMLog } from '../types/llm';
import { llmCache } from './cache';
import { openAIProvider, ossProvider } from './providers';

export class LLMService {
  async processRequest(
    request: LLMRequest,
    requestId: string
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const agentId = request.agentId || 'unknown';
    const model = request.model || 'gpt-3.5-turbo';
    const useCache = request.useCache !== false; // Default to true

    // Log incoming request
    const requestLog: LLMLog = {
      timestamp: new Date().toISOString(),
      type: 'llm_request',
      agentId,
      requestId,
      prompt: request.prompt,
      model,
      details: {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        useCache,
      },
    };
    console.log(JSON.stringify(requestLog, null, 2));

    // Check cache first
    if (useCache) {
      const cached = llmCache.get(request.prompt, model);
      if (cached) {
        const latencyMs = Date.now() - startTime;
        const cacheLog: LLMLog = {
          timestamp: new Date().toISOString(),
          type: 'llm_cache_hit',
          agentId,
          requestId,
          prompt: request.prompt,
          model,
          provider: cached.provider,
          cached: true,
          latencyMs,
        };
        console.log(JSON.stringify(cacheLog, null, 2));

        return {
          response: cached.response,
          model: cached.model,
          provider: cached.provider,
          cached: true,
          timestamp: new Date().toISOString(),
        };
      }

      const cacheMissLog: LLMLog = {
        timestamp: new Date().toISOString(),
        type: 'llm_cache_miss',
        agentId,
        requestId,
        prompt: request.prompt,
        model,
      };
      console.log(JSON.stringify(cacheMissLog, null, 2));
    }

    // Try primary provider (OpenAI) first
    let response: string;
    let provider: 'openai' | 'oss' = 'openai';
    let tokensUsed: number | undefined;

    try {
      const result = await openAIProvider.call(
        request.prompt,
        requestId,
        model,
        request.temperature,
        request.maxTokens
      );
      response = result.response;
      tokensUsed = result.tokensUsed;
    } catch (error) {
      // Log fallback
      const fallbackLog: LLMLog = {
        timestamp: new Date().toISOString(),
        type: 'llm_fallback',
        agentId,
        requestId,
        prompt: request.prompt,
        model,
        error: error instanceof Error ? error.message : String(error),
        details: {
          reason: 'Primary provider (OpenAI) failed, falling back to OSS',
        },
      };
      console.log(JSON.stringify(fallbackLog, null, 2));

      // Fallback to OSS
      provider = 'oss';
      try {
        const result = await ossProvider.call(
          request.prompt,
          requestId,
          model,
          request.temperature,
          request.maxTokens
        );
        response = result.response;
        tokensUsed = result.tokensUsed;
      } catch (fallbackError) {
        const errorLog: LLMLog = {
          timestamp: new Date().toISOString(),
          type: 'llm_error',
          agentId,
          requestId,
          prompt: request.prompt,
          model,
          error: `Both providers failed. Primary: ${error instanceof Error ? error.message : String(error)}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          details: {
            primaryProvider: 'openai',
            fallbackProvider: 'oss',
          },
        };
        console.log(JSON.stringify(errorLog, null, 2));
        throw new Error('All LLM providers failed');
      }
    }

    // Cache the response
    if (useCache) {
      llmCache.set(request.prompt, response, model, provider);
    }

    const latencyMs = Date.now() - startTime;

    // Log successful response
    const responseLog: LLMLog = {
      timestamp: new Date().toISOString(),
      type: 'llm_response',
      agentId,
      requestId,
      prompt: request.prompt,
      response,
      model,
      provider,
      cached: false,
      tokensUsed,
      latencyMs,
    };
    console.log(JSON.stringify(responseLog, null, 2));

    return {
      response,
      model,
      provider,
      cached: false,
      tokensUsed,
      timestamp: new Date().toISOString(),
    };
  }
}

export const llmService = new LLMService();

