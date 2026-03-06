const LIMITS = {
  taxRate: [0, 70],
  profitMargin: [0, 200],
  buffer: [0, 100],
  utilization: [10, 100],
  hoursPerDay: [1, 16],
  daysPerWeek: [1, 7],
  vacationWeeks: [0, 20],
  scopeRisk: [0, 100],
  discount: [0, 90],
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeInput(input = {}) {
  return {
    currency: input.currency || "BRL",
    targetIncome: Math.max(0, toNum(input.targetIncome)),
    monthlyCosts: Math.max(0, toNum(input.monthlyCosts)),
    taxRate: clamp(toNum(input.taxRate), ...LIMITS.taxRate),
    profitMargin: clamp(toNum(input.profitMargin), ...LIMITS.profitMargin),
    buffer: clamp(toNum(input.buffer), ...LIMITS.buffer),
    utilization: clamp(toNum(input.utilization), ...LIMITS.utilization),
    hoursPerDay: clamp(toNum(input.hoursPerDay), ...LIMITS.hoursPerDay),
    daysPerWeek: clamp(toNum(input.daysPerWeek), ...LIMITS.daysPerWeek),
    vacationWeeks: clamp(toNum(input.vacationWeeks), ...LIMITS.vacationWeeks),
    projectHours: Math.max(0, toNum(input.projectHours)),
    scopeRisk: clamp(toNum(input.scopeRisk), ...LIMITS.scopeRisk),
    discount: clamp(toNum(input.discount), ...LIMITS.discount),
  };
}

export function compute(rawInput = {}) {
  const s = normalizeInput(rawInput);

  const baseNeed = s.targetIncome + s.monthlyCosts;
  const totalPercent = (s.taxRate + s.profitMargin + s.buffer) / 100;

  if (totalPercent >= 1) {
    return {
      ok: false,
      error: { message: "A soma de impostos, lucro e buffer deve ser menor que 100%." },
      ...s,
      baseNeed,
      totalPercent: totalPercent * 100,
      revenueTarget: null,
      workingWeeks: Math.max(0, 52 - s.vacationWeeks),
      hoursPerMonth: null,
      billableHours: null,
      hourly: null,
      daily: null,
      projectGross: null,
      projectNet: null,
    };
  }

  const revenueTarget = baseNeed / (1 - totalPercent);
  const workingWeeks = Math.max(0, 52 - s.vacationWeeks);
  const hoursPerMonth = (workingWeeks * s.daysPerWeek * s.hoursPerDay) / 12;
  const billableHours = hoursPerMonth * (s.utilization / 100);

  if (billableHours <= 0) {
    return {
      ok: false,
      error: { message: "Horas faturáveis inválidas. Revise disponibilidade e utilização." },
      ...s,
      baseNeed,
      totalPercent: totalPercent * 100,
      revenueTarget,
      workingWeeks,
      hoursPerMonth,
      billableHours,
      hourly: null,
      daily: null,
      projectGross: null,
      projectNet: null,
    };
  }

  const hourly = revenueTarget / billableHours;
  const daily = hourly * s.hoursPerDay;
  const projectBase = s.projectHours > 0 ? hourly * s.projectHours : null;
  const projectGross = projectBase != null ? projectBase * (1 + s.scopeRisk / 100) : null;
  const projectNet = projectGross != null ? projectGross * (1 - s.discount / 100) : null;

  return {
    ok: true,
    error: null,
    ...s,
    baseNeed,
    totalPercent: totalPercent * 100,
    revenueTarget,
    workingWeeks,
    hoursPerMonth,
    billableHours,
    hourly,
    daily,
    projectGross,
    projectNet,
  };
}
