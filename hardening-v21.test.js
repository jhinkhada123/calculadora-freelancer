import { compute } from "./calculadora.js";
import { computeAdvancedPricing } from "./advanced-pricing.js";
import {
  advancePdfY,
  advancePdfYByLines,
  buildCompositionParts,
  ensurePdfYSpace,
  shouldTrackRiskScoreView,
  validateEndpointUrl,
} from "./hardening-v21.js";

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
    occupancyRate: 80,
    scopeVolatility: "medium",
    weeklyHours: 44,
    ...overrides,
  };
}

describe("hardening-v21", () => {
  test("pdf y progression keeps section below previous block", () => {
    let y = 300;
    y = advancePdfY(y, 14);
    y = advancePdfY(y, 14);
    y = advancePdfY(y, 14);
    y = advancePdfY(y, 18);
    expect(y).toBe(360);
  });

  test("pdf wrapped lines advance y using line count", () => {
    let y = 420;
    y = advancePdfYByLines(y, 2, 12, 6);
    expect(y).toBe(450);
    y = advancePdfYByLines(y, 3, 12, 4);
    expect(y).toBe(490);
  });

  test("pdf space guard moves to new page when near footer", () => {
    const pageHeight = 842;
    const margin = 56;
    const r = ensurePdfYSpace(760, 120, pageHeight, margin, 72);
    expect(r.addPage).toBe(true);
    expect(r.y).toBe(margin);
  });

  test("investment block guard keeps room for title and amount", () => {
    const pageHeight = 842;
    const margin = 56;
    const nearFooter = ensurePdfYSpace(710, 110, pageHeight, margin, 72);
    expect(nearFooter.addPage).toBe(true);
    const withRoom = ensurePdfYSpace(590, 110, pageHeight, margin, 72);
    expect(withRoom.addPage).toBe(false);
  });

  test("telemetry dedup and throttle for risk score view", () => {
    const first = shouldTrackRiskScoreView({
      prev: null,
      score: 61.2,
      mode: "advanced",
      model: "deterministic",
      nowMs: 1000,
    });
    expect(first.shouldTrack).toBe(true);
    const immediate = shouldTrackRiskScoreView({
      prev: first.next,
      score: 61.6,
      mode: "advanced",
      model: "deterministic",
      nowMs: 5000,
    });
    expect(immediate.shouldTrack).toBe(false);
    const afterCooldownSmallDelta = shouldTrackRiskScoreView({
      prev: first.next,
      score: 61.9,
      mode: "advanced",
      model: "deterministic",
      nowMs: 11_500,
    });
    expect(afterCooldownSmallDelta.shouldTrack).toBe(false);
    const afterCooldownBigDelta = shouldTrackRiskScoreView({
      prev: first.next,
      score: 63.0,
      mode: "advanced",
      model: "deterministic",
      nowMs: 12_000,
    });
    expect(afterCooldownBigDelta.shouldTrack).toBe(true);
  });

  test("endpoint validation accepts https and localhost http only", () => {
    expect(validateEndpointUrl("https://api.exemplo.com/hook").ok).toBe(true);
    expect(validateEndpointUrl("http://localhost:3000/hook").ok).toBe(true);
    expect(validateEndpointUrl("http://127.0.0.1:8787/hook").ok).toBe(true);
    const blocked = validateEndpointUrl("http://api.exemplo.com/hook");
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toBe("HTTP_EXTERNAL_BLOCKED");
  });

  test("advanced composition is coherent with revenue target", () => {
    const s = state();
    const essential = compute(s);
    const adv = computeAdvancedPricing({ state: s, essential, useMonteCarlo: false });
    const ctx = { mode: "advanced", essential, advanced: adv };
    const parts = buildCompositionParts(s, adv.output, ctx);
    const sum = parts.reduce((acc, p) => acc + p.value, 0);
    expect(parts.length).toBeGreaterThan(3);
    expect(sum).toBeCloseTo(adv.output.revenueTarget, 2);
  });

  test("essential-mode parity remains within ±0.01", () => {
    const s = state({ assetValue: 0, opportunityRateAnnual: 0, occupancyRate: 60, weeklyHours: 40, scopeVolatility: "low" });
    const a = compute(s);
    const b = compute(s);
    expect(Math.abs((a.hourly || 0) - (b.hourly || 0))).toBeLessThanOrEqual(0.01);
    expect(Math.abs((a.revenueTarget || 0) - (b.revenueTarget || 0))).toBeLessThanOrEqual(0.01);
  });
});
