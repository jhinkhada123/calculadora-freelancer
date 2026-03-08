import { computePricingEngineV1 } from "../../src/domain/pricing/engine-v1.js";
import { isPricingReasonCodeV1 } from "../../src/domain/pricing/reason-codes-v1.js";

const EXPLAIN_INPUT = {
  targetIncome: 9000,
  monthlyCosts: 1200,
  taxRate: 10,
  profitMargin: 5,
  buffer: 6,
  utilization: 45,
  hoursPerDay: 6,
  daysPerWeek: 5,
  vacationWeeks: 4,
  scopeRisk: 80,
  discount: 10,
  projectHours: 40,
  scopeClarity: "unclear",
  urgentDeadline: true,
  revisionLoad: "high",
  engagementModel: "project",
};

describe("pricing engine v1 explain factors", () => {
  test("all explain factors are auditable and ordered by impact", () => {
    const result = computePricingEngineV1(EXPLAIN_INPUT);

    expect(Array.isArray(result.explainFactors)).toBe(true);
    expect(result.explainFactors.length).toBeGreaterThan(0);

    for (const factor of result.explainFactors) {
      expect(isPricingReasonCodeV1(factor.code)).toBe(true);
      expect(typeof factor.impactoValor).toBe("number");
      expect(factor.impactoValor).toBeGreaterThan(0);
      expect(typeof factor.impactoPct).toBe("number");
      expect(factor.impactoPct).toBeGreaterThan(0);
      expect(typeof factor.evidencia).toBe("string");
      expect(factor.evidencia.length).toBeGreaterThan(8);
      expect(typeof factor.formulaRef).toBe("string");
      expect(factor.formulaRef.length).toBeGreaterThan(8);
    }

    for (let i = 1; i < result.explainFactors.length; i += 1) {
      expect(result.explainFactors[i - 1].impactoValor).toBeGreaterThanOrEqual(result.explainFactors[i].impactoValor);
    }
  });
});
