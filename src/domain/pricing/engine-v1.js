import { isPricingReasonCodeV1 } from "./reason-codes-v1.js";
import {
  PRICING_IMPACT_PREVIEW_INPUT_KEYS_V1,
  PRICING_TRACE_METRICS_V1,
  PRICING_TRACE_REASON_CODE_BY_INPUT_KEY_V1,
  selectTopTraceDriversV1,
} from "./traceability-v1.js";

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

const TRACE_DRIVER_INPUT_CANDIDATES_BY_METRIC = Object.freeze({
  heroPrice: Object.freeze([
    "utilization",
    "scopeRisk",
    "scopeClarity",
    "revisionLoad",
    "urgentDeadline",
    "profitMargin",
    "buffer",
    "targetIncome",
    "monthlyCosts",
    "taxRate",
  ]),
  sustainablePrice: Object.freeze([
    "projectHours",
    "utilization",
    "scopeRisk",
    "scopeClarity",
    "revisionLoad",
    "urgentDeadline",
    "profitMargin",
    "buffer",
    "targetIncome",
    "monthlyCosts",
    "taxRate",
  ]),
  floorPrice: Object.freeze([
    "projectHours",
    "utilization",
    "targetIncome",
    "monthlyCosts",
    "taxRate",
    "profitMargin",
    "buffer",
  ]),
  riskIndicator: Object.freeze([
    "scopeRisk",
    "scopeClarity",
    "revisionLoad",
    "urgentDeadline",
    "discount",
    "engagementModel",
    "monthlyVolumeHours",
    "buffer",
    "profitMargin",
  ]),
});

const PREVIEW_METRIC_BY_INPUT_KEY = Object.freeze({
  discount: "sustainablePrice",
  scopeClarity: "heroPrice",
  revisionLoad: "heroPrice",
  urgentDeadline: "heroPrice",
  scopeRisk: "riskIndicator",
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

function nextRevisionLoad(value) {
  if (value === "low") return "medium";
  if (value === "medium") return "high";
  return "high";
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

function computeRiskIndicator(state, guardrails, cfg) {
  let score = state.scopeRiskPct;

  if (state.scopeClarity === "unclear") score += 20;
  if (state.urgentDeadline) score += roundMoney(cfg.urgentDeadlinePremiumPct * 100);
  if (state.revisionLoad === "high") score += roundMoney(cfg.highRevisionPremiumPct * 100);
  if (state.revisionLoad === "medium") score += roundMoney(cfg.mediumRevisionPremiumPct * 100);

  if (guardrails.floorBreached) score += 20;
  if (guardrails.retainerWithoutVolume) score += 15;
  if (guardrails.highRisk) score += 10;

  const safeScore = clamp(roundMoney(score), 0, 100);
  return {
    score: safeScore,
    level: safeScore >= 70 ? "high" : safeScore >= 40 ? "medium" : "low",
  };
}

function computeCoreFromState(state, cfg) {
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
  const projectDiscountImpactRaw = Math.max(0, sustainableProjectRaw - projectAfterDiscountRaw);

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
    project: {
      total: roundMoney(sustainableProjectRaw),
      estimatedHours: roundMoney(state.projectHours),
      discountPct: roundMoney(state.discountPct),
      discountImpact: roundMoney(projectDiscountImpactRaw),
      totalAfterDiscount: roundMoney(projectAfterDiscountRaw),
    },
    guardrails,
    riskIndicator: computeRiskIndicator(state, guardrails, cfg),
    explainFactors: buildExplainFactors(projectFloorRaw, state, premiumComponents, cfg),
  };
}

function getCoreMetricValue(coreResult, metric) {
  if (metric === "heroPrice") return coreResult.rates.hora;
  if (metric === "sustainablePrice") return coreResult.pricingBand.sustentavel;
  if (metric === "floorPrice") return coreResult.pricingBand.piso;
  if (metric === "riskIndicator") return coreResult.riskIndicator.score;
  return 0;
}

function withNeutralizedInput(state, inputKey, cfg) {
  const next = { ...state };

  if (inputKey === "projectHours") {
    next.projectHours = Math.max(1, cfg.defaultProjectHours);
  } else if (inputKey === "scopeRisk") {
    next.scopeRiskPct = 0;
  } else if (inputKey === "discount") {
    next.discountPct = 0;
  } else if (inputKey === "scopeClarity") {
    next.scopeClarity = "clear";
  } else if (inputKey === "revisionLoad") {
    next.revisionLoad = "low";
  } else if (inputKey === "urgentDeadline") {
    next.urgentDeadline = false;
  } else if (inputKey === "engagementModel") {
    next.engagementModel = "project";
  } else if (inputKey === "monthlyVolumeHours") {
    next.monthlyVolumeHours = Math.max(state.monthlyVolumeHours, cfg.minRetainerVolumeHours);
  } else if (inputKey === "utilization" || inputKey === "occupancyRate") {
    next.utilizationPct = 100;
  } else if (inputKey === "profitMargin") {
    next.profitMargin = Math.max(state.profitMargin, cfg.minHealthyMarginPct);
  } else if (inputKey === "buffer") {
    next.buffer = Math.max(state.buffer, cfg.minBufferForHighRiskPct);
  } else if (inputKey === "targetIncome") {
    next.targetIncome = 0;
  } else if (inputKey === "monthlyCosts") {
    next.monthlyCosts = 0;
  } else if (inputKey === "taxRate") {
    next.taxRate = 0;
  } else {
    return null;
  }

  if (JSON.stringify(next) === JSON.stringify(state)) {
    return null;
  }

  return next;
}

function buildTraceabilityMap(coreResult, state, cfg) {
  const traceability = {};

  for (const metric of PRICING_TRACE_METRICS_V1) {
    const baseValue = getCoreMetricValue(coreResult, metric);
    const candidates = [];
    const inputKeys = TRACE_DRIVER_INPUT_CANDIDATES_BY_METRIC[metric] || [];

    for (const inputKey of inputKeys) {
      const counterfactualState = withNeutralizedInput(state, inputKey, cfg);
      if (!counterfactualState) continue;

      const counterfactualResult = computeCoreFromState(counterfactualState, cfg);
      const counterfactualValue = getCoreMetricValue(counterfactualResult, metric);
      const impact = Math.abs(baseValue - counterfactualValue);
      if (impact <= 0) continue;

      candidates.push({
        inputKey,
        impact,
        reasonCode: PRICING_TRACE_REASON_CODE_BY_INPUT_KEY_V1[inputKey],
      });
    }

    traceability[metric] = selectTopTraceDriversV1(candidates, 3);
  }

  return traceability;
}

function withPreviewScenario(state, inputKey) {
  const next = { ...state };

  if (inputKey === "discount") {
    next.discountPct = Math.min(95, state.discountPct + 5);
  } else if (inputKey === "scopeClarity") {
    next.scopeClarity = state.scopeClarity === "unclear" ? "clear" : "unclear";
  } else if (inputKey === "revisionLoad") {
    next.revisionLoad = nextRevisionLoad(state.revisionLoad);
  } else if (inputKey === "urgentDeadline") {
    next.urgentDeadline = !state.urgentDeadline;
  } else if (inputKey === "scopeRisk") {
    next.scopeRiskPct = Math.min(100, state.scopeRiskPct + 10);
  } else {
    return null;
  }

  if (JSON.stringify(next) === JSON.stringify(state)) {
    return null;
  }

  return next;
}

function buildPreviewDelta(inputKey, metric, baseValueRaw, previewValueRaw) {
  const baseValue = toFiniteNumber(baseValueRaw, 0);
  const previewValue = toFiniteNumber(previewValueRaw, baseValue);
  const deltaValue = roundMoney(previewValue - baseValue);
  const deltaPct = baseValue > 0 ? roundMoney((deltaValue / baseValue) * 100) : 0;

  let direction = "neutral";
  if (deltaValue > 0) direction = "up";
  if (deltaValue < 0) direction = "down";

  return {
    inputKey,
    metric,
    deltaValue,
    deltaPct,
    direction,
  };
}

function getPreviewMetricValue(coreResult, inputKey, metric) {
  if (inputKey === "discount" && metric === "sustainablePrice") {
    return coreResult.project.totalAfterDiscount;
  }
  return getCoreMetricValue(coreResult, metric);
}

function buildImpactPreviewMap(coreResult, state, cfg) {
  const impactPreview = {};

  for (const inputKey of PRICING_IMPACT_PREVIEW_INPUT_KEYS_V1) {
    const metric = PREVIEW_METRIC_BY_INPUT_KEY[inputKey] || "heroPrice";
    const previewState = withPreviewScenario(state, inputKey);
    const baseValue = getPreviewMetricValue(coreResult, inputKey, metric);

    if (!previewState) {
      impactPreview[inputKey] = buildPreviewDelta(inputKey, metric, baseValue, baseValue);
      continue;
    }

    const previewResult = computeCoreFromState(previewState, cfg);
    const previewValue = getPreviewMetricValue(previewResult, inputKey, metric);
    impactPreview[inputKey] = buildPreviewDelta(inputKey, metric, baseValue, previewValue);
  }

  return impactPreview;
}

export function computePricingEngineV1(input = {}, config = {}) {
  const cfg = { ...PRICING_ENGINE_V1_DEFAULTS, ...config };
  const state = sanitizeInput(input, cfg);

  const coreResult = computeCoreFromState(state, cfg);

  return {
    contractVersion: PRICING_ENGINE_V1_CONTRACT_VERSION,
    pricingBand: coreResult.pricingBand,
    rates: coreResult.rates,
    economics: coreResult.economics,
    project: coreResult.project,
    guardrails: coreResult.guardrails,
    riskIndicator: coreResult.riskIndicator,
    explainFactors: coreResult.explainFactors,
    traceability: buildTraceabilityMap(coreResult, state, cfg),
    impactPreview: buildImpactPreviewMap(coreResult, state, cfg),
  };
}
