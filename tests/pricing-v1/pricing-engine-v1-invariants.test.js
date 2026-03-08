import { computePricingEngineV1, PRICING_ENGINE_V1_CONTRACT_VERSION } from "../../src/domain/pricing/engine-v1.js";

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

describe("pricing engine v1 invariants", () => {
  test("keeps ordering and positive economics", () => {
    const result = computePricingEngineV1(BASE_INPUT);

    expect(result.contractVersion).toBe(PRICING_ENGINE_V1_CONTRACT_VERSION);
    expect(result.pricingBand.piso).toBeLessThanOrEqual(result.pricingBand.sustentavel);
    expect(result.pricingBand.sustentavel).toBeLessThanOrEqual(result.pricingBand.ideal);

    expect(result.rates.hora).toBeGreaterThan(0);
    expect(result.rates.dia).toBeGreaterThan(0);
    expect(result.economics.faturamentoAlvo).toBeGreaterThan(0);
    expect(result.economics.horasFaturaveisMes).toBeGreaterThan(0);
    expect(result.economics.ocupacaoReal).toBeGreaterThan(0);
    expect(result.economics.ocupacaoReal).toBeLessThanOrEqual(1);
  });

  test("project output is engine-owned and internally consistent", () => {
    const result = computePricingEngineV1(BASE_INPUT);

    expect(result.project.total).toBe(result.pricingBand.sustentavel);
    expect(result.project.estimatedHours).toBe(BASE_INPUT.projectHours);
    expect(result.project.discountPct).toBe(BASE_INPUT.discount);
    const discountDrift = Math.abs(result.project.totalAfterDiscount - (result.project.total - result.project.discountImpact));
    expect(discountDrift).toBeLessThanOrEqual(0.02);
  });

  test("hard guardrails flip to true in blocking scenarios", () => {
    const floorBreach = computePricingEngineV1({ ...BASE_INPUT, discount: 80 });
    expect(floorBreach.guardrails.floorBreached).toBe(true);

    const unclearScope = computePricingEngineV1({
      ...BASE_INPUT,
      engagementModel: "project",
      scopeClarity: "unclear",
      profitMargin: 5,
    });
    expect(unclearScope.guardrails.unclearScope).toBe(true);
    expect(unclearScope.guardrails.highRisk).toBe(true);

    const retainerWithoutVolume = computePricingEngineV1({
      ...BASE_INPUT,
      engagementModel: "retainer",
      monthlyVolumeHours: 8,
    });
    expect(retainerWithoutVolume.guardrails.retainerWithoutVolume).toBe(true);
  });
});