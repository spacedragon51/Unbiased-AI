const AUDIT_KEY = "uaids-audit-logs";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

function loadLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuditLog[];
  } catch {
    return [];
  }
}

function saveLogs(logs: AuditLog[]) {
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 100)));
}

export async function logAuditEvent(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  const logs = loadLogs();
  const newLog: AuditLog = {
    id: crypto.randomUUID(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString(),
  };
  saveLogs([newLog, ...logs]);
  window.dispatchEvent(new CustomEvent("audit-log-added", { detail: newLog }));
}

export function getAuditLogs(): AuditLog[] {
  return loadLogs();
}

export type { AuditLog };
