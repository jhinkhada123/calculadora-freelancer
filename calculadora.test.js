/**
 * Testes da função compute() — contrato v2 (ok/error explícito, sem Infinity).
 */
import { compute } from "./calculadora.js";

function state(overrides = {}) {
  return {
    targetIncome: 0,
    monthlyCosts: 0,
    taxRate: 0,
    profitMargin: 0,
    buffer: 0,
    utilization: 100,
    hoursPerDay: 8,
    daysPerWeek: 5,
    vacationWeeks: 4,
    projectHours: 0,
    scopeRisk: 0,
    discount: 0,
    ...overrides,
  };
}

describe("compute() v2", () => {
  test("1) Cálculo por dentro: Base 8000 e totalPercent 20 => revenueTarget = 10000", () => {
    const s = state({
      targetIncome: 6000,
      monthlyCosts: 2000,
      taxRate: 10,
      profitMargin: 6,
      buffer: 4,
    });
    const r = compute(s);
    expect(r.ok).toBe(true);
    expect(r.error).toBe(null);
    expect(r.baseNeed).toBe(8000);
    expect(r.totalPercent).toBe(20);
    expect(r.revenueTargetRaw).toBe(10000);
    expect(r.revenueTarget).toBe(10000);
  });

  test("2) Fluxo completo: hourly, daily e project com valores esperados a partir do revenueTarget", () => {
    const s = state({
      targetIncome: 6000,
      monthlyCosts: 2000,
      taxRate: 10,
      profitMargin: 6,
      buffer: 4,
      utilization: 100,
      hoursPerDay: 8,
      daysPerWeek: 5,
      vacationWeeks: 4,
      projectHours: 40,
      scopeRisk: 10,
      discount: 0,
    });
    const r = compute(s);
    expect(r.ok).toBe(true);
    expect(r.revenueTarget).toBe(10000);
    const workingWeeks = 52 - 4;
    const hoursPerMonth = (workingWeeks * 8 * 5) / 12;
    const billableHours = hoursPerMonth * 1;
    expect(r.billableHours).toBeCloseTo(billableHours, 5);
    const expectedHourly = 10000 / billableHours;
    expect(r.hourlyRaw).toBeCloseTo(expectedHourly, 5);
    expect(r.hourly).toBe(Number(expectedHourly.toFixed(2)));
    expect(r.dailyRaw).toBeCloseTo(r.hourlyRaw * 8, 5);
    expect(r.daily).toBe(Number((r.hourlyRaw * 8).toFixed(2)));
    const expectedGross = 40 * r.hourlyRaw * 1.1;
    expect(r.projectGrossRaw).toBeCloseTo(expectedGross, 5);
    expect(r.projectNetRaw).toBeCloseTo(expectedGross, 5);
    expect(r.projectGross).toBe(Number(expectedGross.toFixed(2)));
    expect(r.projectNet).toBe(Number(expectedGross.toFixed(2)));
  });

  test("3) Bloqueio em 100%: totalPercent = 100 retorna ok=false e error (contrato v2)", () => {
    const s = state({
      targetIncome: 5000,
      monthlyCosts: 2000,
      taxRate: 50,
      profitMargin: 30,
      buffer: 20,
    });
    const r = compute(s);
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe("TOTAL_PERCENT_INVALID");
    expect(r.error.message).toMatch(/menor que 100%|total.*percentuais/i);
    expect(r.totalPercent).toBe(100);
    expect(r.baseNeed).toBe(7000);
    expect(r.revenueTargetRaw).toBe(null);
    expect(r.hourlyRaw).toBe(null);
    expect(r.dailyRaw).toBe(null);
    expect(r.projectGrossRaw).toBe(null);
    expect(r.projectNetRaw).toBe(null);
    expect(r.revenueTarget).toBe(null);
    expect(r.hourly).toBe(null);
    expect(r.daily).toBe(null);
    expect(r.projectGross).toBe(null);
    expect(r.projectNet).toBe(null);
  });

  test("4) Segurança >100%: totalPercent > 100 retorna ok=false (mesmo contrato)", () => {
    const s = state({
      targetIncome: 1000,
      monthlyCosts: 500,
      taxRate: 40,
      profitMargin: 40,
      buffer: 30,
    });
    const r = compute(s);
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe("TOTAL_PERCENT_INVALID");
    expect(r.error.message).toMatch(/menor que 100%|percentuais/i);
    expect(r.totalPercent).toBe(110);
    expect(r.revenueTarget).toBe(null);
    expect(r.hourly).toBe(null);
  });

  test("5) Precisão: Raw sem arredondar; saída com 2 casas decimais", () => {
    const s = state({
      targetIncome: 3333.33,
      monthlyCosts: 1111.11,
      taxRate: 12,
      profitMargin: 10,
      buffer: 5,
    });
    const r = compute(s);
    expect(r.ok).toBe(true);
    const baseNeed = 4444.44;
    expect(r.baseNeed).toBeCloseTo(baseNeed, 2);
    expect(r.totalPercent).toBe(27);
    const raw = baseNeed / (1 - 27 / 100);
    expect(r.revenueTargetRaw).toBeCloseTo(raw, 10);
    expect(r.revenueTarget).toBe(Number(raw.toFixed(2)));
    expect(r.revenueTarget).toBe(Number(r.revenueTarget.toFixed(2)));
  });
});

describe("Contrato para UI (totalPercent >= 100)", () => {
  test("retorna ok=false e error para a UI exibir aviso e bloquear valores", () => {
    const r = compute(state({ taxRate: 50, profitMargin: 30, buffer: 20 }));
    expect(r.ok).toBe(false);
    expect(r.error).not.toBe(null);
    expect(r.error.message).toMatch(/menor que 100%|percentuais/i);
    expect(r.hourly).toBe(null);
    expect(r.revenueTarget).toBe(null);
  });
});

describe("Hardening: billableHours = 0", () => {
  test("utilization 0 é normalizado para piso e mantém cálculo válido", () => {
    const r = compute(state({
      targetIncome: 5000,
      monthlyCosts: 1000,
      taxRate: 10,
      profitMargin: 5,
      buffer: 5,
      utilization: 0,
      hoursPerDay: 8,
      daysPerWeek: 5,
      vacationWeeks: 4,
    }));
    expect(r.ok).toBe(true);
    expect(r.error).toBe(null);
    expect(r.billableHours).toBeGreaterThan(0);
    expect(r.revenueTarget).not.toBe(null);
  });
});

describe("Hardening: inputs vazios/inválidos", () => {
  test("targetIncome NaN é normalizado para 0 sem quebrar", () => {
    const r = compute(state({ targetIncome: NaN, monthlyCosts: 1000 }));
    expect(r.ok).toBe(true);
    expect(r.error).toBe(null);
    expect(r.baseNeed).toBe(1000);
    expect(r.revenueTarget).not.toBe(null);
  });
  test("monthlyCosts negativo => ok=false, INVALID_INPUTS", () => {
    const r = compute(state({ targetIncome: 5000, monthlyCosts: -100 }));
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe("INVALID_INPUTS");
  });
  test("targetIncome negativo => ok=false, INVALID_INPUTS", () => {
    const r = compute(state({ targetIncome: -1, monthlyCosts: 0 }));
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe("INVALID_INPUTS");
  });
});

describe("UX: mensagens de erro orientativas (sem tom punitivo)", () => {
  test("mensagens de erro não contêm termos ásperos (risco, proibido, isento, perdas)", () => {
    const harsh = /\b(risco|proibido|isento|perdas)\b/i;
    const r1 = compute(state({ taxRate: 50, profitMargin: 30, buffer: 20 }));
    const r2 = compute(state({ targetIncome: -1, monthlyCosts: 0 }));
    const r3 = compute(state({ targetIncome: 5000, monthlyCosts: 1000, utilization: 0 }));
    expect(r1.error?.message).not.toMatch(harsh);
    expect(r2.error?.message).not.toMatch(harsh);
    if (typeof r3.error?.message === "string") {
      expect(r3.error.message).not.toMatch(harsh);
    }
  });
});

describe("Hardening: valores muito altos (estabilidade)", () => {
  test("números grandes não quebram e retornam valores finitos", () => {
    const r = compute(state({
      targetIncome: 1e9,
      monthlyCosts: 5e7,
      taxRate: 30,
      profitMargin: 20,
      buffer: 10,
      utilization: 80,
      hoursPerDay: 10,
      daysPerWeek: 6,
      vacationWeeks: 2,
      projectHours: 1000,
    }));
    expect(r.ok).toBe(true);
    expect(r.error).toBe(null);
    expect(Number.isFinite(r.revenueTarget)).toBe(true);
    expect(Number.isFinite(r.hourly)).toBe(true);
    expect(Number.isFinite(r.projectNet)).toBe(true);
    expect(r.revenueTarget).toBeGreaterThan(0);
  });
});
