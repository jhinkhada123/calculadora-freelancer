import { computePricingEngineV1 } from "../../src/domain/pricing/engine-v1.js";

const GOLDEN_CASES = [
  {
    id: "nominal-base",
    input: {
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
    },
    expected: {
      pricingBand: { piso: 8095.24, sustentavel: 8931.75, ideal: 10271.51 },
      rates: { hora: 223.29, dia: 1339.76 },
      economics: { faturamentoAlvo: 17000, horasFaturaveisMes: 84, ocupacaoReal: 0.7 },
      project: { total: 8931.75, estimatedHours: 40, discountPct: 10, discountImpact: 893.17, totalAfterDiscount: 8038.57 },
      guardrails: { floorBreached: true, highRisk: false, unclearScope: false, retainerWithoutVolume: false },
      explainCodes: ["HIGH_SCOPE_RISK", "HIGH_REVISION_LOAD", "LOW_OCCUPANCY"],
    },
  },
  {
    id: "high-risk-unclear",
    input: {
      targetIncome: 9000,
      monthlyCosts: 1200,
      taxRate: 10,
      profitMargin: 8,
      buffer: 6,
      utilization: 45,
      hoursPerDay: 6,
      daysPerWeek: 5,
      vacationWeeks: 4,
      scopeRisk: 80,
      discount: 5,
      projectHours: 40,
      scopeClarity: "unclear",
      urgentDeadline: true,
      revisionLoad: "high",
      engagementModel: "project",
      monthlyVolumeHours: 0,
    },
    expected: {
      pricingBand: { piso: 9941.52, sustentavel: 16423.39, ideal: 18886.9 },
      rates: { hora: 410.58, dia: 2463.51 },
      economics: { faturamentoAlvo: 13421.05, horasFaturaveisMes: 54, ocupacaoReal: 0.45 },
      project: { total: 16423.39, estimatedHours: 40, discountPct: 5, discountImpact: 821.17, totalAfterDiscount: 15602.22 },
      guardrails: { floorBreached: false, highRisk: true, unclearScope: true, retainerWithoutVolume: false },
      explainCodes: ["HIGH_SCOPE_RISK", "URGENT_DEADLINE", "UNCLEAR_SCOPE", "LOW_OCCUPANCY", "HIGH_REVISION_LOAD", "LOW_MARGIN"],
    },
  },
  {
    id: "retainer-without-volume",
    input: {
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
      engagementModel: "retainer",
      monthlyVolumeHours: 8,
    },
    expected: {
      pricingBand: { piso: 8095.24, sustentavel: 8931.75, ideal: 10271.51 },
      rates: { hora: 223.29, dia: 1339.76 },
      economics: { faturamentoAlvo: 17000, horasFaturaveisMes: 84, ocupacaoReal: 0.7 },
      project: { total: 8931.75, estimatedHours: 40, discountPct: 10, discountImpact: 893.17, totalAfterDiscount: 8038.57 },
      guardrails: { floorBreached: true, highRisk: false, unclearScope: false, retainerWithoutVolume: true },
      explainCodes: ["HIGH_SCOPE_RISK", "HIGH_REVISION_LOAD", "LOW_OCCUPANCY"],
    },
  },
];

describe("pricing engine v1 golden dataset", () => {
  test.each(GOLDEN_CASES)("$id", ({ input, expected }) => {
    const result = computePricingEngineV1(input);

    expect(result.pricingBand).toEqual(expected.pricingBand);
    expect(result.rates).toEqual(expected.rates);
    expect(result.economics).toEqual(expected.economics);
    expect(result.project).toEqual(expected.project);
    expect(result.guardrails).toEqual(expected.guardrails);
    expect(result.explainFactors.map((f) => f.code)).toEqual(expected.explainCodes);
  });
});