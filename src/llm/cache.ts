import { CacheEntry } from '../types/llm';

class LLMCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number = 3600000; // 1 hour in milliseconds

  private generateKey(prompt: string, model?: string): string {
    const normalizedPrompt = prompt.trim().toLowerCase();
    const modelKey = model || 'default';
    return `${modelKey}:${normalizedPrompt}`;
  }

  get(prompt: string, model?: string): CacheEntry | null {
    const key = this.generateKey(prompt, model);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(
    prompt: string,
    response: string,
    model: string,
    provider: 'openai' | 'oss',
    ttl?: number
  ): void {
    const key = this.generateKey(prompt, model);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    const entry: CacheEntry = {
      prompt,
      response,
      model,
      provider,
      timestamp: new Date(now).toISOString(),
      expiresAt,
    };

    this.cache.set(key, entry);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton instance
export const llmCache = new LLMCache();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const cleaned = llmCache.cleanup();
  if (cleaned > 0) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'cache_cleanup',
      entriesRemoved: cleaned,
      entriesRemaining: llmCache.size(),
    }));
  }
}, 300000); // 5 minutes

