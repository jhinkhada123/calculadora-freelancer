import { computeTierPricing, TIER_DEFAULTS } from "./proposal-tiers.js";

describe("proposal-tiers", () => {
  test("base -15% enxuto, +40% premium por default", () => {
    const r = computeTierPricing(10000);
    expect(r.essencial).toBe(10000);
    expect(r.enxuto).toBeCloseTo(8500, 2);
    expect(r.premium).toBeCloseTo(14000, 2);
  });

  test("config override tierDiscountPct e tierPremiumPct", () => {
    const r = computeTierPricing(10000, { tierDiscountPct: 10, tierPremiumPct: 50 });
    expect(r.enxuto).toBeCloseTo(9000, 2);
    expect(r.premium).toBeCloseTo(15000, 2);
  });

  test("base inválido retorna null", () => {
    const r = computeTierPricing(NaN);
    expect(r.enxuto).toBeNull();
    expect(r.essencial).toBeNull();
    expect(r.premium).toBeNull();
  });

  test("metadata presente", () => {
    const r = computeTierPricing(10000);
    expect(r.metadata).toBeDefined();
    expect(r.metadata.escopo).toBeDefined();
    expect(r.metadata.sla).toBeDefined();
    expect(r.metadata.risco).toBeDefined();
  });
});
