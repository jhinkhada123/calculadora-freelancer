import { isPricingReasonCodeV1 } from "./reason-codes-v1.js";

export const PRICING_ENGINE_V1_CONTRACT_VERSION = 1;

export const PRICING_ENGINE_V1_DEFAULTS = Object.freeze({
  occupancyTarget: 0.75,
  maxScopeRiskPremiumPct: 0.25,
  maxOccupancyPremiumPct: 0.2,
  unclearScopePremiumPct: 0.1,
  urgentDeadlinePremiumPct: 0.12,
  highRevisionPremiumPct: 0.08,
  mediumRevisionPremiumPct: 0.04,
  maxLowMarginPremiumPct: 0.12,
  idealMarkupPct: 0.15,
  minHealthyMarginPct: 20,
  highScopeRiskThreshold: 70,
  minBufferForHighRiskPct: 10,
  minMarginForClosedUnclearScopePct: 20,
  minRetainerVolumeHours: 20,
  defaultProjectHours: 40,
  maxTotalPercent: 99,
});

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value) {
  return Number(toFiniteNumber(value, 0).toFixed(2));
}

function roundRatio(value) {
  return Number(toFiniteNumber(value, 0).toFixed(4));
}

function normalizeScopeClarity(value) {
  return String(value || "clear").trim().toLowerCase() === "unclear" ? "unclear" : "clear";
}

function normalizeRevisionLoad(value) {
  const raw = String(value || "medium").trim().toLowerCase();
  if (raw === "high") return "high";
  if (raw === "low") return "low";
  return "medium";
}

function normalizeEngagementModel(value) {
  const raw = String(value || "project").trim().toLowerCase();
  if (raw === "retainer") return "retainer";
  if (raw === "hourly") return "hourly";
  return "project";
}

function sanitizeInput(input = {}, cfg = PRICING_ENGINE_V1_DEFAULTS) {
  const utilizationPct = clamp(toFiniteNumber(input.utilization, 60), 1, 100);
  const scopeRiskPct = clamp(toFiniteNumber(input.scopeRisk, 0), 0, 100);
  const discountPct = clamp(toFiniteNumber(input.discount, 0), 0, 95);
  const targetIncome = Math.max(0, toFiniteNumber(input.targetIncome, 0));
  const monthlyCosts = Math.max(0, toFiniteNumber(input.monthlyCosts, 0));
  const taxRate = Math.max(0, toFiniteNumber(input.taxRate, 0));
  const profitMargin = Math.max(0, toFiniteNumber(input.profitMargin, 0));
  const buffer = Math.max(0, toFiniteNumber(input.buffer, 0));
  const vacationWeeks = clamp(toFiniteNumber(input.vacationWeeks, 4), 0, 20);
  const hoursPerDay = clamp(toFiniteNumber(input.hoursPerDay, 6), 1, 16);
  const daysPerWeek = clamp(toFiniteNumber(input.daysPerWeek, 5), 1, 7);
  const projectHours = Math.max(1, toFiniteNumber(input.projectHours, cfg.defaultProjectHours));
  const monthlyVolumeHours = Math.max(0, toFiniteNumber(input.monthlyVolumeHours, 0));

  return {
    targetIncome,
    monthlyCosts,
    taxRate,
    profitMargin,
    buffer,
    utilizationPct,
    scopeRiskPct,
    discountPct,
    vacationWeeks,
    hoursPerDay,
    daysPerWeek,
    projectHours,
    monthlyVolumeHours,
    scopeClarity: normalizeScopeClarity(input.scopeClarity),
    urgentDeadline: !!input.urgentDeadline,
    revisionLoad: normalizeRevisionLoad(input.revisionLoad),
    engagementModel: normalizeEngagementModel(input.engagementModel),
  };
}

function buildPremiumComponents(state, cfg) {
  const occupancyReal = state.utilizationPct / 100;
  const occupancyGap = Math.max(0, cfg.occupancyTarget - occupancyReal);
  const occupancyPremiumPct = cfg.occupancyTarget > 0
    ? (occupancyGap / cfg.occupancyTarget) * cfg.maxOccupancyPremiumPct
    : 0;

  const scopeRiskPremiumPct = (state.scopeRiskPct / 100) * cfg.maxScopeRiskPremiumPct;
  const unclearScopePremiumPct = state.scopeClarity === "unclear" ? cfg.unclearScopePremiumPct : 0;
  const urgentDeadlinePremiumPct = state.urgentDeadline ? cfg.urgentDeadlinePremiumPct : 0;
  const highRevisionPremiumPct = state.revisionLoad === "high"
    ? cfg.highRevisionPremiumPct
    : (state.revisionLoad === "medium" ? cfg.mediumRevisionPremiumPct : 0);

  const marginGap = Math.max(0, cfg.minHealthyMarginPct - state.profitMargin);
  const lowMarginPremiumPct = cfg.minHealthyMarginPct > 0
    ? (marginGap / cfg.minHealthyMarginPct) * cfg.maxLowMarginPremiumPct
    : 0;

  return {
    occupancyPremiumPct,
    scopeRiskPremiumPct,
    unclearScopePremiumPct,
    urgentDeadlinePremiumPct,
    highRevisionPremiumPct,
    lowMarginPremiumPct,
    totalPremiumPct:
      occupancyPremiumPct +
      scopeRiskPremiumPct +
      unclearScopePremiumPct +
      urgentDeadlinePremiumPct +
      highRevisionPremiumPct +
      lowMarginPremiumPct,
  };
}

function sustainableFromPremium(projectFloorPrice, totalPremiumPct) {
  return projectFloorPrice * (1 + Math.max(0, totalPremiumPct));
}

function computeExplainImpactDelta(projectFloorPrice, totalPremiumPct, factorPct) {
  if (!factorPct || factorPct <= 0) {
    return { impactoValor: 0, impactoPct: 0 };
  }

  const sustainableFinalRaw = sustainableFromPremium(projectFloorPrice, totalPremiumPct);
  const counterfactualRaw = sustainableFromPremium(projectFloorPrice, totalPremiumPct - factorPct);
  const deltaRaw = Math.max(0, sustainableFinalRaw - counterfactualRaw);
  const impactoValor = roundMoney(deltaRaw);
  const impactoPct = sustainableFinalRaw > 0
    ? roundMoney((impactoValor / sustainableFinalRaw) * 100)
    : 0;

  return { impactoValor, impactoPct };
}

function buildExplainFactors(projectFloorPrice, state, premiumComponents, cfg) {
  const factors = [];

  const register = (code, pct, evidencia, formulaRef) => {
    if (!pct || pct <= 0) return;
    if (!isPricingReasonCodeV1(code)) return;

    const { impactoValor, impactoPct } = computeExplainImpactDelta(
      projectFloorPrice,
      premiumComponents.totalPremiumPct,
      pct
    );

    if (impactoValor <= 0) return;

    factors.push({
      code,
      impactoValor,
      impactoPct,
      evidencia,
      formulaRef,
    });
  };

  register(
    "LOW_OCCUPANCY",
    premiumComponents.occupancyPremiumPct,
    `ocupacaoReal=${roundRatio(state.utilizationPct / 100)} abaixo do alvo=${cfg.occupancyTarget.toFixed(2)}`,
    "pricing.sustainable.delta.occupancy"
  );
  register(
    "HIGH_SCOPE_RISK",
    premiumComponents.scopeRiskPremiumPct,
    `scopeRiskPct=${roundMoney(state.scopeRiskPct)} aplicado sobre maxScopeRiskPremiumPct=${roundMoney(cfg.maxScopeRiskPremiumPct * 100)}%`,
    "pricing.sustainable.delta.scopeRisk"
  );
  register(
    "UNCLEAR_SCOPE",
    premiumComponents.unclearScopePremiumPct,
    `scopeClarity=${state.scopeClarity}`,
    "pricing.sustainable.delta.unclearScope"
  );
  register(
    "URGENT_DEADLINE",
    premiumComponents.urgentDeadlinePremiumPct,
    `urgentDeadline=${state.urgentDeadline}`,
    "pricing.sustainable.delta.urgentDeadline"
  );
  register(
    "HIGH_REVISION_LOAD",
    premiumComponents.highRevisionPremiumPct,
    `revisionLoad=${state.revisionLoad}`,
    "pricing.sustainable.delta.revisionLoad"
  );
  register(
    "LOW_MARGIN",
    premiumComponents.lowMarginPremiumPct,
    `profitMargin=${roundMoney(state.profitMargin)} abaixo do minimo saudavel=${roundMoney(cfg.minHealthyMarginPct)}`,
    "pricing.sustainable.delta.lowMargin"
  );

  factors.sort((a, b) => b.impactoValor - a.impactoValor);
  return factors;
}

export function computePricingEngineV1(input = {}, config = {}) {
  const cfg = { ...PRICING_ENGINE_V1_DEFAULTS, ...config };
  const state = sanitizeInput(input, cfg);

  const baseNeed = state.targetIncome + state.monthlyCosts;
  const rawTotalPercent = state.taxRate + state.profitMargin + state.buffer;
  const totalPercent = clamp(rawTotalPercent, 0, cfg.maxTotalPercent);
  const denominator = Math.max(0.01, 1 - totalPercent / 100);

  const workingWeeks = Math.max(0, 52 - state.vacationWeeks);
  const hoursPerWeek = state.hoursPerDay * state.daysPerWeek;
  const hoursPerMonth = (workingWeeks * hoursPerWeek) / 12;
  const occupancyReal = state.utilizationPct / 100;
  const billableHoursMonth = Math.max(1, hoursPerMonth * occupancyReal);

  const faturamentoAlvoRaw = baseNeed / denominator;
  const floorHourlyRaw = faturamentoAlvoRaw / billableHoursMonth;
  const projectFloorRaw = floorHourlyRaw * state.projectHours;

  const premiumComponents = buildPremiumComponents(state, cfg);
  const sustainableProjectRaw = projectFloorRaw * (1 + premiumComponents.totalPremiumPct);
  const idealProjectRaw = sustainableProjectRaw * (1 + cfg.idealMarkupPct);

  const sustainableHourlyRaw = sustainableProjectRaw / state.projectHours;
  const dayRateRaw = sustainableHourlyRaw * state.hoursPerDay;

  const projectAfterDiscountRaw = sustainableProjectRaw * (1 - state.discountPct / 100);

  const highRiskByScope = state.scopeRiskPct >= cfg.highScopeRiskThreshold;
  const highRiskByBuffer = highRiskByScope && state.buffer < cfg.minBufferForHighRiskPct;
  const highRiskByClosedUnclear =
    state.engagementModel === "project" &&
    state.scopeClarity === "unclear" &&
    state.profitMargin < cfg.minMarginForClosedUnclearScopePct;

  const guardrails = {
    floorBreached: projectAfterDiscountRaw < projectFloorRaw,
    highRisk: highRiskByScope || highRiskByBuffer || highRiskByClosedUnclear,
    unclearScope: state.scopeClarity === "unclear",
    retainerWithoutVolume:
      state.engagementModel === "retainer" &&
      state.monthlyVolumeHours < cfg.minRetainerVolumeHours,
  };

  return {
    contractVersion: PRICING_ENGINE_V1_CONTRACT_VERSION,
    pricingBand: {
      piso: roundMoney(projectFloorRaw),
      sustentavel: roundMoney(sustainableProjectRaw),
      ideal: roundMoney(idealProjectRaw),
    },
    rates: {
      hora: roundMoney(sustainableHourlyRaw),
      dia: roundMoney(dayRateRaw),
    },
    economics: {
      faturamentoAlvo: roundMoney(faturamentoAlvoRaw),
      horasFaturaveisMes: roundMoney(billableHoursMonth),
      ocupacaoReal: roundRatio(occupancyReal),
    },
    guardrails,
    explainFactors: buildExplainFactors(projectFloorRaw, state, premiumComponents, cfg),
  };
}
