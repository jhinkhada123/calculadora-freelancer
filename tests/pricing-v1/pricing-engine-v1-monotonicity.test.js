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

describe("pricing engine v1 monotonicity", () => {
  test("increasing risk must not reduce sustainable or ideal prices", () => {
    const base = computePricingEngineV1(BASE_INPUT);
    const higherRisk = computePricingEngineV1({ ...BASE_INPUT, scopeRisk: 80 });

    expect(higherRisk.pricingBand.sustentavel).toBeGreaterThanOrEqual(base.pricingBand.sustentavel);
    expect(higherRisk.pricingBand.ideal).toBeGreaterThanOrEqual(base.pricingBand.ideal);
  });

  test("lower utilization must not reduce sustainable rate", () => {
    const base = computePricingEngineV1(BASE_INPUT);
    const lowerUtilization = computePricingEngineV1({ ...BASE_INPUT, utilization: 40 });

    expect(lowerUtilization.rates.hora).toBeGreaterThanOrEqual(base.rates.hora);
  });

  test("higher margin must not reduce target revenue", () => {
    const base = computePricingEngineV1(BASE_INPUT);
    const higherMargin = computePricingEngineV1({ ...BASE_INPUT, profitMargin: 35 });

    expect(higherMargin.economics.faturamentoAlvo).toBeGreaterThanOrEqual(base.economics.faturamentoAlvo);
  });

  test("higher buffer must not reduce sustainable price", () => {
    const base = computePricingEngineV1(BASE_INPUT);
    const higherBuffer = computePricingEngineV1({ ...BASE_INPUT, buffer: 20 });

    expect(higherBuffer.pricingBand.sustentavel).toBeGreaterThanOrEqual(base.pricingBand.sustentavel);
  });

  test("more billable hours must not increase hourly rate", () => {
    const base = computePricingEngineV1(BASE_INPUT);
    const moreBillableHours = computePricingEngineV1({ ...BASE_INPUT, hoursPerDay: 8 });

    expect(moreBillableHours.rates.hora).toBeLessThanOrEqual(base.rates.hora);
  });
});
