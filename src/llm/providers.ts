import { LLMRequest, LLMResponse, LLMLog } from '../types/llm';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}

interface OSSResponse {
  response: string;
  tokens?: number;
}

class OpenAIProvider {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  async call(
    prompt: string,
    requestId: string,
    model: string = 'gpt-3.5-turbo',
    temperature: number = 0.7,
    maxTokens?: number
  ): Promise<{ response: string; tokensUsed?: number }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        const log: LLMLog = {
          timestamp: new Date().toISOString(),
          type: 'llm_error',
          requestId,
          provider: 'openai',
          model,
          error: `OpenAI API error: ${response.status} ${errorText}`,
          latencyMs,
        };
        console.log(JSON.stringify(log, null, 2));
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as OpenAIResponse;
      const responseText = data.choices[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens;

      return {
        response: responseText,
        tokensUsed,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const log: LLMLog = {
        timestamp: new Date().toISOString(),
        type: 'llm_error',
        requestId,
        provider: 'openai',
        model,
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
      };
      console.log(JSON.stringify(log, null, 2));
      throw error;
    }
  }
}

class OSSProvider {
  private baseURL: string;
  private model: string;

  constructor() {
    this.baseURL = process.env.OSS_LLM_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OSS_LLM_MODEL || 'llama2';
  }

  async call(
    prompt: string,
    requestId: string,
    model?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<{ response: string; tokensUsed?: number }> {
    const startTime = Date.now();
    const useModel = model || this.model;

    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          prompt,
          stream: false,
          options: {
            temperature: temperature || 0.7,
            num_predict: maxTokens,
          },
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        const log: LLMLog = {
          timestamp: new Date().toISOString(),
          type: 'llm_error',
          requestId,
          provider: 'oss',
          model: useModel,
          error: `OSS LLM API error: ${response.status} ${errorText}`,
          latencyMs,
        };
        console.log(JSON.stringify(log, null, 2));
        throw new Error(`OSS LLM API error: ${response.status}`);
      }

      const data = await response.json() as OSSResponse;
      const responseText = data.response || '';
      const tokensUsed = data.tokens;

      return {
        response: responseText,
        tokensUsed,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const log: LLMLog = {
        timestamp: new Date().toISOString(),
        type: 'llm_error',
        requestId,
        provider: 'oss',
        model: useModel,
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
      };
      console.log(JSON.stringify(log, null, 2));
      throw error;
    }
  }
}

export const openAIProvider = new OpenAIProvider();
export const ossProvider = new OSSProvider();

