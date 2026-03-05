/**
 * Módulo de compliance: aceite de termos, trilha de auditoria, versões.
 * Uso: sem backend; dados em localStorage. Estrutura preparada para endpoint futuro.
 */
export const TERMS_VERSION = "1.0";
export const APP_VERSION = "1.0";
export const FORMULA_VERSION = "2.0";

const ACCEPTANCE_KEY = "freela_terms_acceptance_v1";
const AUDIT_KEY = "freela_audit_trail_v1";
const SESSION_KEY = "freela_session_id";
const MAX_AUDIT_ENTRIES = 200;

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

/** Hash simples do texto aceito (para rastreabilidade). Não é criptográfico. */
export function textChecksum(txt) {
  if (typeof txt !== "string") return "";
  let h = 0;
  for (let i = 0; i < txt.length; i++) {
    h = ((h << 5) - h + txt.charCodeAt(i)) | 0;
  }
  return "h" + Math.abs(h).toString(36);
}

export function getAcceptanceLog() {
  try {
    const raw = localStorage.getItem(ACCEPTANCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function recordAcceptance(payload) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      termsVersion: (payload && payload.termsVersion) ?? TERMS_VERSION,
      textChecksum: (payload && payload.textChecksum) ?? "",
      sessionId: (payload && payload.sessionId) ?? getSessionId(),
      scrolled_to_end: payload && payload.scrolled_to_end === true,
    };
    localStorage.setItem(ACCEPTANCE_KEY, JSON.stringify(entry));
    return true;
  } catch (_) {
    return false;
  }
}

export function hasAcceptedTerms() {
  const log = getAcceptanceLog();
  if (!log || typeof log !== "object" || Array.isArray(log)) return false;
  if (log.termsVersion !== TERMS_VERSION) return false;
  if (log.scrolled_to_end !== true) return false;
  if (typeof log.timestamp !== "string" || !log.timestamp) return false;
  if (typeof log.textChecksum !== "string" || !log.textChecksum) return false;
  if (typeof log.sessionId !== "string" || !log.sessionId) return false;
  return true;
}

export function getAuditTrail() {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAuditSnapshot(snapshot) {
  try {
    const trail = getAuditTrail();
    const entry = {
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      formulaVersion: FORMULA_VERSION,
      ...(snapshot && typeof snapshot === "object" ? snapshot : {}),
    };
    trail.push(entry);
    const trimmed = trail.slice(-MAX_AUDIT_ENTRIES);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
    return true;
  } catch (_) {
    return false;
  }
}

export const LEGAL_DISCLAIMER =
  "Esta ferramenta fornece estimativas e não garante resultados financeiros. Para decisões fiscais, contábeis ou jurídicas, consulte um profissional qualificado.";

export const CALC_PREMISES =
  "Premissas: faturamento alvo = base ÷ (1 − total%), com base = renda desejada + custos; taxa/hora = faturamento alvo ÷ horas faturáveis; projeto = horas × taxa × (1 + margem escopo) × (1 − desconto).";
