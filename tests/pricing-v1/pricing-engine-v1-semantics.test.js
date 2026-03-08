import { computePricingEngineV1 } from "../../src/domain/pricing/engine-v1.js";

const BASE_INPUT = {
  targetIncome: 9000,
  monthlyCosts: 1200,
  taxRate: 10,
  profitMargin: 20,
  buffer: 10,
  utilization: 70,
  hoursPerDay: 6,
  daysPerWeek: 5,
  vacationWeeks: 4,
  scopeRisk: 20,
  discount: 10,
  projectHours: 40,
  scopeClarity: "clear",
  urgentDeadline: false,
  revisionLoad: "medium",
  engagementModel: "project",
  monthlyVolumeHours: 0,
};

const EXPLAIN_CONFIG_OVERRIDES = {
  LOW_OCCUPANCY: { maxOccupancyPremiumPct: 0 },
  HIGH_SCOPE_RISK: { maxScopeRiskPremiumPct: 0 },
  UNCLEAR_SCOPE: { unclearScopePremiumPct: 0 },
  URGENT_DEADLINE: { urgentDeadlinePremiumPct: 0 },
  HIGH_REVISION_LOAD: { highRevisionPremiumPct: 0, mediumRevisionPremiumPct: 0 },
  LOW_MARGIN: { maxLowMarginPremiumPct: 0 },
};

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

describe("pricing engine v1 semantics", () => {
  test("guardrail reason codes stay in guardrails, not explainFactors", () => {
    const discountBlocked = computePricingEngineV1({ ...BASE_INPUT, discount: 80 });
    const discountCodes = discountBlocked.explainFactors.map((f) => f.code);

    expect(discountBlocked.guardrails.floorBreached).toBe(true);
    expect(discountCodes.includes("DISCOUNT_BELOW_FLOOR")).toBe(false);

    const retainerBlocked = computePricingEngineV1({
      ...BASE_INPUT,
      engagementModel: "retainer",
      monthlyVolumeHours: 8,
    });
    const retainerCodes = retainerBlocked.explainFactors.map((f) => f.code);

    expect(retainerBlocked.guardrails.retainerWithoutVolume).toBe(true);
    expect(retainerCodes.includes("RETAINER_WITHOUT_VOLUME")).toBe(false);
  });


  test("project totals and discount impact remain domain-owned", () => {
    const result = computePricingEngineV1(BASE_INPUT);

    expect(result.project.total).toBe(result.pricingBand.sustentavel);
    const discountImpactDelta = Math.abs(result.project.discountImpact - Number((result.project.total - result.project.totalAfterDiscount).toFixed(2)));
    expect(discountImpactDelta).toBeLessThanOrEqual(0.02);
  });

  test("explain impacts match counterfactual deltas", () => {
    const input = {
      ...BASE_INPUT,
      utilization: 45,
      scopeRisk: 80,
      scopeClarity: "unclear",
      urgentDeadline: true,
      revisionLoad: "high",
      profitMargin: 8,
      buffer: 6,
    };

    const base = computePricingEngineV1(input);

    for (const factor of base.explainFactors) {
      const override = EXPLAIN_CONFIG_OVERRIDES[factor.code];
      expect(override).toBeDefined();

      const withoutFactor = computePricingEngineV1(input, override);
      const delta = roundMoney(base.pricingBand.sustentavel - withoutFactor.pricingBand.sustentavel);

      expect(factor.impactoValor).toBeCloseTo(delta, 2);
    }
  });
});
