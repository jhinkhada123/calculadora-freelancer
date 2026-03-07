import { compute } from "../../calculadora.js";

const GOLDEN_CASES = [
  {
    id: "nominal-base",
    state: {
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
    },
    expected: {
      ok: true,
      revenueTarget: 17000,
      hourly: 202.38,
      daily: 1214.29,
      projectGross: 9714.29,
      projectNet: 8742.86,
    },
  },
  {
    id: "high-margin",
    state: {
      targetIncome: 9000,
      monthlyCosts: 1200,
      taxRate: 10,
      profitMargin: 35,
      buffer: 10,
      utilization: 70,
      hoursPerDay: 6,
      daysPerWeek: 5,
      vacationWeeks: 4,
      scopeRisk: 20,
      discount: 10,
      projectHours: 40,
    },
    expected: {
      ok: true,
      revenueTarget: 22666.67,
      hourly: 269.84,
      daily: 1619.05,
      projectGross: 12952.38,
      projectNet: 11657.14,
    },
  },
  {
    id: "invalid-percent-total",
    state: {
      targetIncome: 9000,
      monthlyCosts: 1200,
      taxRate: 40,
      profitMargin: 40,
      buffer: 25,
      utilization: 70,
      hoursPerDay: 6,
      daysPerWeek: 5,
      vacationWeeks: 4,
      scopeRisk: 20,
      discount: 10,
      projectHours: 40,
    },
    expected: {
      ok: false,
      errorCode: "TOTAL_PERCENT_INVALID",
      revenueTarget: null,
      hourly: null,
      daily: null,
      projectGross: null,
      projectNet: null,
    },
  },
];

describe("governance: pricing golden dataset", () => {
  test.each(GOLDEN_CASES)("$id", ({ state, expected }) => {
    const result = compute(state);

    expect(result.ok).toBe(expected.ok);

    if (expected.ok) {
      expect(result.revenueTarget).toBe(expected.revenueTarget);
      expect(result.hourly).toBe(expected.hourly);
      expect(result.daily).toBe(expected.daily);
      expect(result.projectGross).toBe(expected.projectGross);
      expect(result.projectNet).toBe(expected.projectNet);
      return;
    }

    expect(result.error?.code).toBe(expected.errorCode);
    expect(result.revenueTarget).toBeNull();
    expect(result.hourly).toBeNull();
    expect(result.daily).toBeNull();
    expect(result.projectGross).toBeNull();
    expect(result.projectNet).toBeNull();
  });
});
