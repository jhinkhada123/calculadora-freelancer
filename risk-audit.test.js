import { computeRiskScore, computeSubscores } from "./risk-audit.js";
import { getExhaustionFactor } from "./advanced-pricing.js";

describe("risk-audit", () => {
  test("aplica fórmula ponderada e clamp 0-100", () => {
    const result = computeRiskScore({
      scopeFactor: 1.25,
      occupancyRate: 95,
      exhaustionFactor: 1.4,
      denominator: 0.35,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.subscores.riscoEscopo).toBeCloseTo(100, 1);
  });

  test("ocupação abaixo de 60 zera pressão de ocupação", () => {
    const subs = computeSubscores({
      scopeFactor: 1,
      occupancyRate: 55,
      exhaustionFactor: 1,
      denominator: 0.7,
    });
    expect(subs.ocupacaoPressao).toBe(0);
  });

  test("regra de exaustão é refletida no subscore", () => {
    const ex = getExhaustionFactor(52);
    const subs = computeSubscores({
      scopeFactor: 1,
      occupancyRate: 60,
      exhaustionFactor: ex,
      denominator: 0.7,
    });
    expect(subs.exaustaoPressao).toBeGreaterThan(0);
  });
});
