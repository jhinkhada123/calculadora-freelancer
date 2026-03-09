/**
 * Teste focado: scope-adjustments-v1 — discount presets produzem projectNet engine-owned.
 * Garante que 0/5/10/15% desconto são aplicados via engine (calculadora.js), não via fórmula na UI.
 */
import { compute } from "./calculadora.js";

const DISCOUNT_PRESETS = [0, 5, 10, 15];

function baseState() {
  return {
    targetIncome: 6000,
    monthlyCosts: 2000,
    taxRate: 10,
    profitMargin: 6,
    buffer: 4,
    utilization: 100,
    hoursPerDay: 8,
    daysPerWeek: 5,
    vacationWeeks: 4,
    projectHours: 40,
    scopeRisk: 15,
    discount: 0,
  };
}

describe("scope-adjustments-v1: discount presets", () => {
  test("cada preset 0/5/10/15 aplica desconto via engine; projectNet = engine output (sem fórmula UI)", () => {
    for (const discountPct of DISCOUNT_PRESETS) {
      const s = { ...baseState(), discount: discountPct };
      const r = compute(s);
      expect(r.ok).toBe(true);
      expect(r.projectGross).not.toBeNull();
      expect(r.projectNet).not.toBeNull();

      const expectedNet = r.projectGross * (1 - discountPct / 100);
      expect(r.projectNet).toBeCloseTo(expectedNet, 2);
    }
  });
});
