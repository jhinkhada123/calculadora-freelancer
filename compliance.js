const ACCEPT_KEY = "freela_terms_acceptance_v1";
const SESSION_KEY = "freela_terms_session_id_v1";
const AUDIT_KEY = "freela_audit_trail_v1";
const AUDIT_MAX_ITEMS = 200;

export const TERMS_VERSION = "2026-01";
export const LEGAL_DISCLAIMER =
  "Estimativas para apoio comercial. Valores não constituem aconselhamento jurídico, fiscal ou contábil e podem variar conforme escopo, impostos e condições contratuais.";

export function textChecksum(text = "") {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

export function getSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `sess-fallback-${Date.now()}`;
  }
}

export function hasAcceptedTerms() {
  try {
    const raw = localStorage.getItem(ACCEPT_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Boolean(data && data.termsVersion === TERMS_VERSION && data.acceptedAt);
  } catch {
    return false;
  }
}

export function recordAcceptance(payload = {}) {
  const data = {
    termsVersion: TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
    sessionId: getSessionId(),
    ...payload,
  };
  try {
    localStorage.setItem(ACCEPT_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
  return data;
}

export function appendAuditSnapshot(snapshot = {}) {
  const entry = {
    at: new Date().toISOString(),
    sessionId: getSessionId(),
    ...snapshot,
  };
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? list : [];
    next.push(entry);
    if (next.length > AUDIT_MAX_ITEMS) {
      next.splice(0, next.length - AUDIT_MAX_ITEMS);
    }
    localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  } catch {
    // noop
  }
  return entry;
}
