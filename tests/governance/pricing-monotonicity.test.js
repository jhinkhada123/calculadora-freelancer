import { compute } from "../../calculadora.js";

const BASE_STATE = {
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
};

describe("governance: pricing monotonicity", () => {
  test("increasing risk must not reduce project values", () => {
    const base = compute(BASE_STATE);
    const higherRisk = compute({ ...BASE_STATE, scopeRisk: 80 });

    expect(base.ok).toBe(true);
    expect(higherRisk.ok).toBe(true);
    expect(higherRisk.projectGross).toBeGreaterThanOrEqual(base.projectGross);
    expect(higherRisk.projectNet).toBeGreaterThanOrEqual(base.projectNet);
  });

  test("lower utilization must not reduce hourly and daily rates", () => {
    const base = compute(BASE_STATE);
    const lowerUtilization = compute({ ...BASE_STATE, utilization: 40 });

    expect(base.ok).toBe(true);
    expect(lowerUtilization.ok).toBe(true);
    expect(lowerUtilization.hourly).toBeGreaterThanOrEqual(base.hourly);
    expect(lowerUtilization.daily).toBeGreaterThanOrEqual(base.daily);
  });

  test("higher margin must not reduce revenue target", () => {
    const base = compute(BASE_STATE);
    const higherMargin = compute({ ...BASE_STATE, profitMargin: 35 });

    expect(base.ok).toBe(true);
    expect(higherMargin.ok).toBe(true);
    expect(higherMargin.revenueTarget).toBeGreaterThanOrEqual(base.revenueTarget);
  });

  test("higher discount must not increase project net", () => {
    const base = compute(BASE_STATE);
    const higherDiscount = compute({ ...BASE_STATE, discount: 25 });

    expect(base.ok).toBe(true);
    expect(higherDiscount.ok).toBe(true);
    expect(higherDiscount.projectNet).toBeLessThanOrEqual(base.projectNet);
  });

  test("invalid total percent must trigger guardrail", () => {
    const invalid = compute({ ...BASE_STATE, taxRate: 60, profitMargin: 25, buffer: 20 });

    expect(invalid.ok).toBe(false);
    expect(invalid.error?.code).toBe("TOTAL_PERCENT_INVALID");
  });
});
