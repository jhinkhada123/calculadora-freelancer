/**
 * Compliance module: terms acceptance, audit trail and version metadata.
 * localStorage is used for traceability only and does not provide legal proof.
 */
export const TERMS_VERSION = "1.0";
export const APP_VERSION = "1.0";
export const FORMULA_VERSION = "2.0";

const ACCEPTANCE_KEY = "freela_terms_acceptance_v1";
const AUDIT_KEY = "freela_audit_trail_v1";
const SESSION_KEY = "freela_session_id";
const MAX_AUDIT_ENTRIES = 200;

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
  }
}

/** Non-cryptographic checksum for traceability only. */
export function textChecksum(text = "") {
  if (typeof text !== "string") return "";
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

export function getAcceptanceLog() {
  try {
    const raw = localStorage.getItem(ACCEPTANCE_KEY);
    if (!raw || typeof raw !== "string") return null;
    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) return null;
    if (typeof parsed.termsVersion !== "string") return null;
    if (typeof parsed.textChecksum !== "string") return null;
    if (typeof parsed.sessionId !== "string") return null;
    if (typeof parsed.timestamp !== "string") return null;
    if (typeof parsed.scrolled_to_end !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function recordAcceptance(payload = {}) {
  try {
    const safe = isObject(payload) ? payload : {};
    const entry = {
      timestamp: new Date().toISOString(),
      termsVersion: typeof safe.termsVersion === "string" ? safe.termsVersion : TERMS_VERSION,
      textChecksum: typeof safe.textChecksum === "string" ? safe.textChecksum : "",
      sessionId: typeof safe.sessionId === "string" ? safe.sessionId : getSessionId(),
      scrolled_to_end: safe.scrolled_to_end === true,
    };
    localStorage.setItem(ACCEPTANCE_KEY, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export function hasAcceptedTerms() {
  const log = getAcceptanceLog();
  if (!log) return false;
  if (log.termsVersion !== TERMS_VERSION) return false;
  if (log.scrolled_to_end !== true) return false;
  if (!log.timestamp || !log.textChecksum || !log.sessionId) return false;
  return true;
}

export function getAuditTrail() {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (!raw || typeof raw !== "string") return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isObject).slice(-MAX_AUDIT_ENTRIES);
  } catch {
    return [];
  }
}

export function appendAuditSnapshot(snapshot = {}) {
  try {
    const trail = getAuditTrail();
    const safeSnapshot = isObject(snapshot) ? snapshot : {};
    const entry = {
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      formulaVersion: FORMULA_VERSION,
      ...safeSnapshot,
    };
    trail.push(entry);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(trail.slice(-MAX_AUDIT_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}

export const LEGAL_DISCLAIMER =
  "Esta ferramenta fornece estimativas e não garante resultados financeiros. Para decisões fiscais, contábeis ou jurídicas, consulte um profissional qualificado.";

export const CALC_PREMISES =
  "Premissas: faturamento alvo = base / (1 - total%), com base = renda desejada + custos; taxa/hora = faturamento alvo / horas faturáveis; projeto = horas x taxa x (1 + margem escopo) x (1 - desconto).";
