import { compute } from "./calculadora.js";
import { evaluateBenchmarkAlerts } from "./benchmarking.js";

function state(overrides = {}) {
  return {
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
    currency: "BRL",
    ...overrides,
  };
}

describe("evaluateBenchmarkAlerts()", () => {
  test("emite critical para utilização > 90", () => {
    const s = state({ utilization: 95 });
    const r = compute(s);
    const alerts = evaluateBenchmarkAlerts(s, r);
    expect(alerts.some((a) => a.id === "utilization-critical" && a.severity === "critical")).toBe(true);
  });

  test("emite warning para carga diária > 8h", () => {
    const s = state({ hoursPerDay: 9 });
    const r = compute(s);
    const alerts = evaluateBenchmarkAlerts(s, r);
    expect(alerts.some((a) => a.id === "hours-warning")).toBe(true);
  });

  test("emite aviso de férias baixas", () => {
    const s = state({ vacationWeeks: 1 });
    const r = compute(s);
    const alerts = evaluateBenchmarkAlerts(s, r);
    expect(alerts.some((a) => a.id === "vacation-warning")).toBe(true);
  });

  test("emite warning/critical por total de percentuais altos", () => {
    const warningState = state({ taxRate: 30, profitMargin: 25, buffer: 25 });
    const warningAlerts = evaluateBenchmarkAlerts(warningState, compute(warningState));
    expect(warningAlerts.some((a) => a.id === "total-warning")).toBe(true);

    const criticalState = state({ taxRate: 40, profitMargin: 30, buffer: 20 });
    const criticalAlerts = evaluateBenchmarkAlerts(criticalState, compute(criticalState));
    expect(criticalAlerts.some((a) => a.id === "total-critical")).toBe(true);
  });
});
