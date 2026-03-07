/**
 * Testes de segurança: payloads XSS em query, import e storage.
 * Valida que sanitizeState e escapeHtml mitigam injeção.
 */
import { escapeHtml } from "../utils/escape.js";
import { sanitizeState } from "../utils/sanitize-state.js";

const defaults = () => ({
  currency: "BRL",
  targetIncome: 9000,
  professionalName: "",
  clientName: "",
  areaImpacto: "",
  validityDate: "",
  scopeVolatility: "medium",
});

describe("Security XSS", () => {
  describe("escapeHtml", () => {
    test("payload script em areaImpacto não executa", () => {
      const payload = '<script>alert("xss")</script>';
      expect(escapeHtml(payload)).not.toContain("<script>");
      expect(escapeHtml(payload)).toContain("&lt;script&gt;");
    });

    test("payload img onerror escapado", () => {
      const payload = '<img src=x onerror="alert(1)">';
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain("<");
      expect(escaped).not.toContain(">");
    });
  });

  describe("sanitizeState - query params", () => {
    test("areaImpacto malicioso truncado e mantido como string", () => {
      const payload = '<script>alert(1)</script>Operações';
      const out = sanitizeState(defaults(), { areaImpacto: payload });
      expect(out.areaImpacto.length).toBeLessThanOrEqual(200);
      expect(typeof out.areaImpacto).toBe("string");
    });

    test("professionalName truncado em 140 chars", () => {
      const payload = "A".repeat(200);
      const out = sanitizeState(defaults(), { professionalName: payload });
      expect(out.professionalName.length).toBe(140);
    });
  });

  describe("sanitizeState - import/storage", () => {
    test("objeto arbitrário descarta chaves desconhecidas", () => {
      const raw = {
        targetIncome: 5000,
        foo: "bar",
        areaImpacto: "normal",
      };
      const d = defaults();
      const out = sanitizeState(d, raw);
      expect(Object.keys(out).sort()).toEqual(Object.keys(d).sort());
      expect(out.targetIncome).toBe(5000);
      expect(out).not.toHaveProperty("foo");
    });

    test("NaN e Infinity em números rejeitados", () => {
      const raw = { targetIncome: NaN, monthlyCosts: Infinity };
      const d = defaults();
      d.monthlyCosts = 1200;
      const out = sanitizeState(d, raw);
      expect(out.targetIncome).toBe(0);
      expect(out.monthlyCosts).toBeLessThanOrEqual(1e12);
    });

    test("enum inválido cai para default", () => {
      const raw = { scopeVolatility: "<script>alert(1)</script>" };
      const out = sanitizeState(defaults(), raw);
      expect(["low", "medium", "high"]).toContain(out.scopeVolatility);
    });
  });
});
