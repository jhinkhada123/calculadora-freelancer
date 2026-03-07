import {
  buildProposalMetrics,
  pickClientSafe,
  pickPublicExportSafe,
  assertNoLeakage,
  CLIENT_SAFE_KEYS,
  PUBLIC_EXPORT_KEYS,
  SHARE_KEYS,
  toFiniteNumber,
  roundMoney,
  roundPct,
  clampPct,
  FEATURE_FLAGS_DEFAULTS,
} from "./proposal-metrics.js";

describe("proposal-metrics", () => {
  describe("helpers numéricos", () => {
    test("toFiniteNumber retorna número ou fallback", () => {
      expect(toFiniteNumber(10)).toBe(10);
      expect(toFiniteNumber("5.5")).toBe(5.5);
      expect(toFiniteNumber(NaN, 0)).toBe(0);
      expect(toFiniteNumber(Infinity, -1)).toBe(-1);
      expect(toFiniteNumber(null, 99)).toBe(0);
    });

    test("roundMoney aplica 2 casas", () => {
      expect(roundMoney(10.456)).toBe(10.46);
      expect(roundMoney(0)).toBe(0);
      expect(roundMoney(NaN)).toBe(0);
    });

    test("roundPct aplica 1 casa", () => {
      expect(roundPct(10.456)).toBe(10.5);
      expect(roundPct(0)).toBe(0);
    });

    test("clampPct mantém 0..100", () => {
      expect(clampPct(50)).toBe(50);
      expect(clampPct(-10)).toBe(0);
      expect(clampPct(150)).toBe(100);
    });
  });

  describe("pickClientSafe e assertNoLeakage", () => {
    test("pickClientSafe extrai apenas whitelist", () => {
      const obj = { revenueTarget: 1000, hourly: 50, batnaLevel: "ALTO", internalX: 1 };
      const safe = pickClientSafe(obj);
      expect(safe.revenueTarget).toBe(1000);
      expect(safe.hourly).toBe(50);
      expect(safe.batnaLevel).toBeUndefined();
      expect(safe.internalX).toBeUndefined();
    });

    test("assertNoLeakage lança se internalOnly vaza em clientSafe", () => {
      expect(() => assertNoLeakage({ batnaLevel: "ALTO" }, { batnaLevel: "ALTO" })).toThrow("Leakage");
      expect(() => assertNoLeakage({ batnaLevel: "ALTO" }, { revenueTarget: 100 })).not.toThrow();
      expect(() => assertNoLeakage(null, {})).not.toThrow();
    });

    test("assertNoLeakage deep scan: paths completos e top-level keys", () => {
      expect(() => assertNoLeakage({ batna: { level: "ALTO" } }, { batna: { level: "ALTO" } })).toThrow("Leakage");
      expect(() => assertNoLeakage({ batnaLevel: "ALTO" }, { foo: [{ batnaLevel: "ALTO" }] })).toThrow("Leakage");
      expect(() => assertNoLeakage({ batnaLevel: "ALTO" }, { revenueTarget: 100, nested: { x: 1 } })).not.toThrow();
    });

    test("assertNoLeakage valida path completo batna.level", () => {
      expect(() => assertNoLeakage({ batna: { level: "ALTO", message: "x" } }, { batna: { level: "ALTO" } })).toThrow("Leakage");
    });

    test("assertNoLeakage com objeto cíclico não entra em loop", () => {
      const cycle = { a: 1 };
      cycle.self = cycle;
      expect(() => assertNoLeakage({ batnaLevel: "ALTO" }, cycle)).not.toThrow();
    });
  });

  describe("buildProposalMetrics", () => {
    test("payload estável com flags OFF (null, não omitir)", () => {
      const state = { currency: "BRL", projectHours: 30 };
      const outputs = { essential: { hourly: 100, projectNet: 3000, revenueTarget: 12000 } };
      const m = buildProposalMetrics(state, outputs, {});

      expect(m.schemaVersion).toBe(1);
      expect(m.clientSafe.agencyEconomiaValor).toBeNull();
      expect(m.clientSafe.agencyEconomiaPercentual).toBeNull();
      expect(m.clientSafe.custoInacaoSemanal).toBeNull();
      expect(m.clientSafe.tierEnxuto).toBeNull();
      expect(m.internalOnly.batnaLevel).toBeNull();
    });

    test("roundMoney/roundPct aplicados em clientSafe", () => {
      const state = { currency: "BRL" };
      const outputs = {
        essential: { hourly: 99.999, projectNet: 2999.996, revenueTarget: 11999.5 },
      };
      const m = buildProposalMetrics(state, outputs, {});
      expect(m.clientSafe.hourly).toBe(100);
      expect(m.clientSafe.projectNet).toBe(3000);
      expect(m.clientSafe.revenueTarget).toBe(11999.5);
    });

    test("agency_enabled aplica valores normalizados", () => {
      const state = { currency: "BRL" };
      const outputs = {
        essential: { hourly: 100, projectNet: 3000 },
        agency: { economiaValor: 1500.456, economiaPercentual: 33.33, agencyCost: 4500, proposalCost: 3000 },
      };
      const m = buildProposalMetrics(state, outputs, { agency_enabled: true });
      expect(m.clientSafe.agencyEconomiaValor).toBe(1500.46);
      expect(m.clientSafe.agencyEconomiaPercentual).toBe(33.3);
    });

    test("auditoria normalização: floats sujos viram precisão correta e nulls preservados", () => {
      const state = { currency: "BRL", scopeRisk: 15.999, discount: 5.444 };
      const outputs = {
        essential: { hourly: 99.999999, projectNet: 2999.999999, revenueTarget: 0.1 + 0.2 },
        agency: { economiaValor: 1000.005, economiaPercentual: 150, agencyCost: 4000, proposalCost: 3000 },
        inacao: { custoInacaoSemanal: 192.307692, vcePct: -5, valorGanhoEstimado12m: 10000 },
      };
      const m = buildProposalMetrics(state, outputs, { agency_enabled: true, inacao_enabled: true });
      expect(m.clientSafe.hourly).toBe(100);
      expect(m.clientSafe.projectNet).toBe(3000);
      expect(m.clientSafe.agencyEconomiaPercentual).toBe(100);
      expect(m.clientSafe.vcePct).toBe(0);
      expect(m.clientSafe.custoInacaoSemanal).toBe(192.31);
    });

    test("não-vazamento: internalOnly nunca em clientSafe", () => {
      const state = {};
      const outputs = {
        essential: { hourly: 100 },
        batna: { batnaLevel: "ALTO", batnaMessage: "msg" },
      };
      const m = buildProposalMetrics(state, outputs, { batna_enabled: true });
      expect(m.clientSafe.batnaLevel).toBeUndefined();
      expect(m.internalOnly.batnaLevel).toBe("ALTO");
      expect(() => assertNoLeakage(m.internalOnly, m.clientSafe)).not.toThrow();
    });
  });

  describe("SHARE_KEYS", () => {
    test("SHARE_KEYS definido e mais restrito que CLIENT_SAFE_KEYS", () => {
      expect(SHARE_KEYS).toBeDefined();
      expect(SHARE_KEYS.size).toBeLessThanOrEqual(CLIENT_SAFE_KEYS.size);
      for (const k of SHARE_KEYS) {
        expect(CLIENT_SAFE_KEYS.has(k)).toBe(true);
      }
    });
    test("SHARE_KEYS sem PII e sem internalOnly", () => {
      expect(SHARE_KEYS.has("professionalName")).toBe(false);
      expect(SHARE_KEYS.has("clientName")).toBe(false);
      expect(SHARE_KEYS.has("batnaLevel")).toBe(false);
    });
  });

  describe("PUBLIC_EXPORT_KEYS e pickPublicExportSafe", () => {
    test("PUBLIC_EXPORT_KEYS não inclui PII (nomes)", () => {
      expect(PUBLIC_EXPORT_KEYS.has("professionalName")).toBe(false);
      expect(PUBLIC_EXPORT_KEYS.has("clientName")).toBe(false);
    });
    test("PUBLIC_EXPORT_KEYS não inclui internalOnly", () => {
      expect(PUBLIC_EXPORT_KEYS.has("batnaLevel")).toBe(false);
      expect(PUBLIC_EXPORT_KEYS.has("batnaMessage")).toBe(false);
    });
    test("PUBLIC_EXPORT_KEYS é subconjunto de CLIENT_SAFE_KEYS", () => {
      for (const k of PUBLIC_EXPORT_KEYS) {
        expect(CLIENT_SAFE_KEYS.has(k)).toBe(true);
      }
    });
    test("pickPublicExportSafe exclui PII", () => {
      const obj = { revenueTarget: 1000, professionalName: "João", clientName: "Acme" };
      const out = pickPublicExportSafe(obj);
      expect(out.revenueTarget).toBe(1000);
      expect(out.professionalName).toBeUndefined();
      expect(out.clientName).toBeUndefined();
    });
  });

  describe("FEATURE_FLAGS_DEFAULTS", () => {
    test("todos OFF", () => {
      expect(FEATURE_FLAGS_DEFAULTS.agency_enabled).toBe(false);
      expect(FEATURE_FLAGS_DEFAULTS.inacao_enabled).toBe(false);
      expect(FEATURE_FLAGS_DEFAULTS.batna_enabled).toBe(false);
      expect(FEATURE_FLAGS_DEFAULTS.tiers_enabled).toBe(false);
    });
  });
});
