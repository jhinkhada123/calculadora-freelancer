/**
 * Testes de compliance: aceite de termos, trilha de auditoria, avisos legais.
 */
import {
  hasAcceptedTerms,
  recordAcceptance,
  getAcceptanceLog,
  getSessionId,
  textChecksum,
  TERMS_VERSION,
  appendAuditSnapshot,
  getAuditTrail,
  LEGAL_DISCLAIMER,
  CALC_PREMISES,
} from "./compliance.js";

const ACCEPTANCE_KEY = "freela_terms_acceptance_v1";
const AUDIT_KEY = "freela_audit_trail_v1";

function clearComplianceStorage() {
  try {
    localStorage.removeItem(ACCEPTANCE_KEY);
    localStorage.removeItem(AUDIT_KEY);
  } catch (_) {}
}

describe("Compliance: bloqueio sem aceite", () => {
  beforeEach(clearComplianceStorage);

  test("hasAcceptedTerms() retorna false quando não há log de aceite", () => {
    expect(hasAcceptedTerms()).toBe(false);
  });

  test("hasAcceptedTerms() retorna false quando scrolled_to_end não é true", () => {
    recordAcceptance({
      termsVersion: TERMS_VERSION,
      sessionId: getSessionId(),
      scrolled_to_end: false,
    });
    expect(hasAcceptedTerms()).toBe(false);
  });
});

describe("Compliance: habilitação do botão Aceitar (contrato de aceite)", () => {
  beforeEach(clearComplianceStorage);

  test("após recordAcceptance com scrolled_to_end=true, hasAcceptedTerms() retorna true", () => {
    recordAcceptance({
      termsVersion: TERMS_VERSION,
      textChecksum: textChecksum("termos"),
      sessionId: getSessionId(),
      scrolled_to_end: true,
    });
    expect(hasAcceptedTerms()).toBe(true);
  });

  test("getAcceptanceLog() retorna objeto com timestamp, termsVersion, scrolled_to_end", () => {
    recordAcceptance({
      termsVersion: TERMS_VERSION,
      textChecksum: "h1a2b3",
      sessionId: "sess_123",
      scrolled_to_end: true,
    });
    const log = getAcceptanceLog();
    expect(log).not.toBe(null);
    expect(log.timestamp).toBeDefined();
    expect(log.termsVersion).toBe(TERMS_VERSION);
    expect(log.scrolled_to_end).toBe(true);
    expect(log.sessionId).toBe("sess_123");
    expect(log.textChecksum).toBe("h1a2b3");
  });
});

describe("Compliance: avisos legais", () => {
  test("LEGAL_DISCLAIMER está definido e contém texto de estimativa/garantia", () => {
    expect(LEGAL_DISCLAIMER).toBeDefined();
    expect(typeof LEGAL_DISCLAIMER).toBe("string");
    expect(LEGAL_DISCLAIMER.length).toBeGreaterThan(20);
    expect(LEGAL_DISCLAIMER).toMatch(/estimativas/i);
    expect(LEGAL_DISCLAIMER).toMatch(/não garante/i);
    expect(LEGAL_DISCLAIMER).toMatch(/contábil|fiscal|jurídica/i);
  });

  test("CALC_PREMISES está definido e menciona premissas de cálculo", () => {
    expect(CALC_PREMISES).toBeDefined();
    expect(typeof CALC_PREMISES).toBe("string");
    expect(CALC_PREMISES).toMatch(/premissas|faturamento|taxa/i);
  });
});

describe("Compliance: persistência do snapshot de cálculo", () => {
  beforeEach(clearComplianceStorage);

  test("appendAuditSnapshot persiste entrada com inputs, outputs, versões e timestamp", () => {
    appendAuditSnapshot({
      inputs: { targetIncome: 5000, monthlyCosts: 1000 },
      outputs: { revenueTarget: 10000, hourly: 100 },
    });
    const trail = getAuditTrail();
    expect(trail.length).toBe(1);
    expect(trail[0].timestamp).toBeDefined();
    expect(trail[0].appVersion).toBeDefined();
    expect(trail[0].formulaVersion).toBeDefined();
    expect(trail[0].inputs).toEqual({ targetIncome: 5000, monthlyCosts: 1000 });
    expect(trail[0].outputs).toEqual({ revenueTarget: 10000, hourly: 100 });
  });

  test("trilha limitada a 200 entradas (estável)", () => {
    for (let i = 0; i < 150; i++) {
      appendAuditSnapshot({ inputs: { x: i }, outputs: { y: i } });
    }
    const trail = getAuditTrail();
    expect(trail.length).toBeLessThanOrEqual(200);
  });
});

describe("Compliance: textChecksum e getSessionId", () => {
  test("textChecksum retorna string para texto", () => {
    expect(textChecksum("termos")).toBeDefined();
    expect(typeof textChecksum("abc")).toBe("string");
  });

  test("getSessionId retorna string não vazia", () => {
    expect(getSessionId()).toBeDefined();
    expect(getSessionId().length).toBeGreaterThan(0);
  });
});
