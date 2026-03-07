/**
 * Logica de calculo da calculadora de precificacao (contrato v2).
 * Faturamento alvo: calculo "por dentro" — base / (1 - totalPercent/100).
 * Erro explicito: ok: false, error: { code, message }, valores numericos null.
 */
const TOTAL_PERCENT_ERROR = {
  code: "TOTAL_PERCENT_INVALID",
  message: "Revise os percentuais: o total (imposto + lucro + buffer) precisa ser menor que 100% para calcular.",
};
const INVALID_INPUTS_ERROR = {
  code: "INVALID_INPUTS",
  message: "Informe valores validos para renda e custos para continuar.",
};
const INVALID_PERCENT_ERROR = {
  code: "INVALID_PERCENT",
  message: "Preencha todos os percentuais (impostos, margem de lucro, buffer) com numeros validos.",
};
const BILLABLE_HOURS_ERROR = {
  code: "BILLABLE_HOURS_INVALID",
  message: "Para calcular a taxa/hora, ajuste utilizacao, horas por dia ou ferias para que as horas faturaveis sejam maiores que zero.",
};

function round2(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(2));
}

function invalidInputsPayload(baseNeed, totalPercent, workingWeeks, hoursPerMonth, billableHours) {
  return {
    ok: false,
    baseNeed: baseNeed ?? 0,
    totalPercent: totalPercent ?? 0,
    workingWeeks: workingWeeks ?? 0,
    hoursPerMonth: hoursPerMonth ?? 0,
    billableHours: billableHours ?? 0,
    revenueTargetRaw: null,
    hourlyRaw: null,
    dailyRaw: null,
    projectGrossRaw: null,
    projectNetRaw: null,
    revenueTarget: null,
    hourly: null,
    daily: null,
    projectGross: null,
    projectNet: null,
  };
}

/** Normaliza numero com default; evita NaN/undefined em formulas. */
function num(x, def) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

export function compute(s = {}) {
  const targetIncome = num(s.targetIncome, 0);
  const monthlyCosts = num(s.monthlyCosts, 0);
  if (targetIncome < 0 || monthlyCosts < 0) {
    return {
      ...invalidInputsPayload(0, 0, 0, 0, 0),
      error: INVALID_INPUTS_ERROR,
    };
  }

  const vacationWeeks = Math.max(0, Math.min(20, num(s.vacationWeeks, 4)));
  const hoursPerDay = Math.max(1, Math.min(16, num(s.hoursPerDay, 8)));
  const daysPerWeek = Math.max(1, Math.min(7, num(s.daysPerWeek, 5)));
  const utilization = Math.max(10, Math.min(100, num(s.utilization, 100)));
  const workingWeeks = Math.max(0, 52 - vacationWeeks);
  const hoursPerWeek = hoursPerDay * daysPerWeek;
  const hoursPerMonth = (workingWeeks * hoursPerWeek) / 12;
  const billableHours = hoursPerMonth * (utilization / 100);

  const baseNeed = targetIncome + monthlyCosts;
  const totalPercent = num(s.taxRate, 0) + num(s.profitMargin, 0) + num(s.buffer, 0);

  if (!Number.isFinite(totalPercent) || totalPercent < 0) {
    return {
      ...invalidInputsPayload(baseNeed, 0, 0, 0, 0),
      error: INVALID_PERCENT_ERROR,
    };
  }
  if (totalPercent >= 100) {
    return {
      ...invalidInputsPayload(baseNeed, totalPercent, workingWeeks, hoursPerMonth, billableHours),
      error: TOTAL_PERCENT_ERROR,
    };
  }

  if (billableHours <= 0) {
    return {
      ...invalidInputsPayload(baseNeed, totalPercent, workingWeeks, hoursPerMonth, billableHours),
      error: BILLABLE_HOURS_ERROR,
    };
  }

  const scopeRisk = Math.max(0, Math.min(100, num(s.scopeRisk, 0)));
  const discount = Math.max(0, Math.min(90, num(s.discount, 0)));
  const projectHours = Math.max(0, num(s.projectHours, 0));

  const revenueTargetRaw = baseNeed / (1 - totalPercent / 100);
  const hourlyRaw = billableHours > 0 ? revenueTargetRaw / billableHours : 0;
  const dailyRaw = hourlyRaw * hoursPerDay;
  const projectMultiplier = 1 + scopeRisk / 100;
  const projectGrossRaw = projectHours * hourlyRaw * projectMultiplier;
  const projectNetRaw = projectGrossRaw * (1 - discount / 100);

  return {
    ok: true,
    error: null,
    baseNeed,
    totalPercent,
    workingWeeks,
    hoursPerMonth,
    billableHours,
    revenueTargetRaw,
    hourlyRaw,
    dailyRaw,
    projectGrossRaw,
    projectNetRaw,
    revenueTarget: round2(revenueTargetRaw),
    hourly: round2(hourlyRaw),
    daily: round2(dailyRaw),
    projectGross: round2(projectGrossRaw),
    projectNet: round2(projectNetRaw),
  };
}

// governance-validation: high-pass noop
