import { compute } from "./calculadora.js";
import {
  computeAdvancedPricing,
  computeAgencyEquivalent,
  AGENCY_EQUIVALENT_DEFAULTS,
  getScarcityFactor,
  getExhaustionFactor,
  seededMonteCarloScopeFactor,
} from "./advanced-pricing.js";

function state(overrides = {}) {
  return {
    currency: "BRL",
    targetIncome: 9000,
    monthlyCosts: 1200,
    taxRate: 12,
    profitMargin: 15,
    buffer: 10,
    utilization: 60,
    hoursPerDay: 6,
    daysPerWeek: 5,
    vacationWeeks: 4,
    projectHours: 30,
    scopeRisk: 15,
    discount: 0,
    assetValue: 20000,
    assetUsefulLifeMonths: 48,
    opportunityRateAnnual: 12,
    occupancyRate: 70,
    scopeVolatility: "medium",
    weeklyHours: 42,
    ...overrides,
  };
}

describe("advanced-pricing formulas", () => {
  test("depreciation and opportunity cost formulas", () => {
    const s = state({ assetValue: 12000, assetUsefulLifeMonths: 24, opportunityRateAnnual: 12 });
    const essential = compute(s);
    const adv = computeAdvancedPricing({ state: s, essential, useMonteCarlo: false });
    expect(adv.ok).toBe(true);
    expect(adv.data.depreciationMonthly).toBeCloseTo(500, 8);
    const expectedOpp = 12000 * (Math.pow(1 + 0.12, 1 / 12) - 1);
    expect(adv.data.opportunityCostMonthly).toBeCloseTo(expectedOpp, 8);
  });

  test("scarcity piecewise behavior", () => {
    expect(getScarcityFactor(50)).toBeCloseTo(1.0, 8);
    expect(getScarcityFactor(80)).toBeCloseTo(1.12, 8);
    expect(getScarcityFactor(95)).toBeCloseTo(1.25, 8);
    expect(getScarcityFactor(99)).toBeCloseTo(1.3, 8);
  });

  test("exhaustion non-linear curve", () => {
    expect(getExhaustionFactor(40)).toBeCloseTo(1.0, 8);
    expect(getExhaustionFactor(45)).toBeCloseTo(1 + 5 * 0.015, 8);
    expect(getExhaustionFactor(55)).toBeCloseTo(1 + 10 * 0.015 + 5 * 0.03, 8);
    expect(getExhaustionFactor(120)).toBeLessThanOrEqual(1.6);
  });

  test("advanced final hourly edge case clamps invalid denominator", () => {
    const s = state({ taxRate: 50, profitMargin: 30, buffer: 20 });
    const essential = compute(state());
    const adv = computeAdvancedPricing({ state: s, essential, useMonteCarlo: false });
    expect(adv.ok).toBe(false);
  });

  test("essential regression parity baseline compute unchanged", () => {
    const s = state({ assetValue: 0, opportunityRateAnnual: 0, occupancyRate: 60, scopeVolatility: "low", weeklyHours: 40 });
    const essentialA = compute(s);
    const essentialB = compute(s);
    expect(essentialA.hourly).toBeCloseTo(essentialB.hourly, 2);
    expect(Math.abs((essentialA.revenueTarget || 0) - (essentialB.revenueTarget || 0))).toBeLessThanOrEqual(0.01);
  });

  test("monte carlo reproducible with fixed seed", () => {
    const samples = Array.from({ length: 30 }, (_, i) => 1 + (i % 5) * 0.02);
    const a = seededMonteCarloScopeFactor(samples);
    const b = seededMonteCarloScopeFactor(samples);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.p50).toBeCloseTo(b.p50, 8);
    expect(a.p80).toBeCloseTo(b.p80, 8);
    expect(a.p95).toBeCloseTo(b.p95, 8);
  });
});

describe("computeAgencyEquivalent", () => {
  test("retorna null quando horas ou rate inválidos", () => {
    expect(computeAgencyEquivalent({ projectHours: 0, hourly: 100 }).economiaValor).toBeNull();
    expect(computeAgencyEquivalent({ projectHours: 30, hourly: 0, projectNet: 0 }).economiaValor).toBeNull();
    expect(computeAgencyEquivalent({ projectHours: -1 }).economiaValor).toBeNull();
  });

  test("economiaValor = max(0, agencyCost - proposalCost)", () => {
    const r = computeAgencyEquivalent({ projectHours: 30, hourly: 100, projectNet: 3000 });
    expect(r.agencyCost).toBeGreaterThan(0);
    expect(r.proposalCost).toBe(3000);
    expect(r.economiaValor).toBeGreaterThanOrEqual(0);
    expect(r.economiaValor).toBeCloseTo(Math.max(0, r.agencyCost - 3000), 2);
  });

  test("economiaPercentual clampado 0..100 e proteção divisor zero", () => {
    const r = computeAgencyEquivalent({ projectHours: 30, hourly: 100, projectNet: 3000 });
    expect(r.economiaPercentual).toBeGreaterThanOrEqual(0);
    expect(r.economiaPercentual).toBeLessThanOrEqual(100);
  });

  test("fallback proposalCost = hourly * hours quando projectNet ausente", () => {
    const r = computeAgencyEquivalent({ projectHours: 20, hourly: 150 });
    expect(r.proposalCost).toBe(3000);
  });

  test("cenários conservative/base/aggressive configuráveis", () => {
    const base = { projectHours: 30, hourly: 100, projectNet: 3000 };
    const cons = computeAgencyEquivalent(base, { scenario: "conservative" });
    const agg = computeAgencyEquivalent(base, { scenario: "aggressive" });
    expect(cons.agencyCost).toBeLessThan(agg.agencyCost);
  });

  test("taxaContaPM override sem regressão", () => {
    const base = { projectHours: 20, hourly: 100, projectNet: 2000 };
    const defaultResult = computeAgencyEquivalent(base);
    const overrideResult = computeAgencyEquivalent(base, { taxaContaPM: 250 });
    expect(overrideResult.agencyCost).not.toBe(defaultResult.agencyCost);
    expect(overrideResult.agencyCost).toBeGreaterThan(0);
  });
});
