import { Request, Response, NextFunction } from 'express';
import { LLMLog } from '../types/llm';

interface ThrottleRecord {
  requests: number[];
  hourlyRequests: number[];
}

class ThrottleManager {
  private records: Map<string, ThrottleRecord> = new Map();
  private readonly maxRequestsPerMinute: number;
  private readonly maxRequestsPerHour: number;

  constructor(
    maxRequestsPerMinute: number = 60,
    maxRequestsPerHour: number = 1000
  ) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.maxRequestsPerHour = maxRequestsPerHour;
  }

  getIdentifier(req: Request): string {
    // Use agent ID if available, otherwise use IP or connection info
    const agentId = req.headers['x-agent-id'] as string;
    if (agentId) {
      return agentId;
    }
    // Fallback to IP if available, otherwise use a combination of headers
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ip;
  }

  private cleanupOldRequests(record: ThrottleRecord): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    record.requests = record.requests.filter((timestamp) => timestamp > oneMinuteAgo);
    record.hourlyRequests = record.hourlyRequests.filter((timestamp) => timestamp > oneHourAgo);
  }

  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    let record = this.records.get(identifier);

    if (!record) {
      record = { requests: [], hourlyRequests: [] };
      this.records.set(identifier, record);
    }

    this.cleanupOldRequests(record);

    const now = Date.now();

    // Check per-minute limit
    if (record.requests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...record.requests);
      const retryAfter = Math.ceil((60000 - (now - oldestRequest)) / 1000);
      return { allowed: false, retryAfter };
    }

    // Check per-hour limit
    if (record.hourlyRequests.length >= this.maxRequestsPerHour) {
      const oldestRequest = Math.min(...record.hourlyRequests);
      const retryAfter = Math.ceil((3600000 - (now - oldestRequest)) / 1000);
      return { allowed: false, retryAfter };
    }

    // Record the request
    record.requests.push(now);
    record.hourlyRequests.push(now);

    return { allowed: true };
  }

  reset(identifier: string): void {
    this.records.delete(identifier);
  }
}

const throttleManager = new ThrottleManager(
  parseInt(process.env.LLM_MAX_REQUESTS_PER_MINUTE || '60', 10),
  parseInt(process.env.LLM_MAX_REQUESTS_PER_HOUR || '1000', 10)
);

export const throttleMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const identifier = throttleManager.getIdentifier(req);
  const check = throttleManager.check(identifier);

  if (!check.allowed) {
    const log: LLMLog = {
      timestamp: new Date().toISOString(),
      type: 'llm_error',
      agentId: req.headers['x-agent-id'] as string,
      requestId: req.headers['x-request-id'] as string || 'unknown',
      error: 'Rate limit exceeded',
      details: {
        identifier,
        retryAfter: check.retryAfter,
      },
    };

    console.log(JSON.stringify(log, null, 2));

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests',
      retryAfter: check.retryAfter,
    });
    return;
  }

  next();
};

