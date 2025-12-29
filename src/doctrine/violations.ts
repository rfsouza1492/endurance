export interface DoctrineViolation {
  timestamp: string;
  agentId: string;
  violation: string;
  details?: Record<string, unknown>;
}

export const logViolation = (agentId: string, violation: string, details?: Record<string, unknown>): void => {
  const violationRecord: DoctrineViolation = {
    timestamp: new Date().toISOString(),
    agentId,
    violation,
    details,
  };
  
  console.error('[DOCTRINE VIOLATION]', JSON.stringify(violationRecord, null, 2));
};

