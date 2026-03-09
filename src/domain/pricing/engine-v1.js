import { isPricingReasonCodeV1 } from "./reason-codes-v1.js";
import {
  TRACEABILITY_REASON_TO_INPUT_KEY_V1,
  isTraceabilityInputKeyV1,
} from "./traceability-v1.js";

export const PRICING_ENGINE_V1_CONTRACT_VERSION = 1;
const MAX_TRACEABILITY_DRIVERS = 3;

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

function computeCoreFinancials(state, cfg) {
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

  return {
    baseNeed,
    totalPercent,
    denominator,
    workingWeeks,
    hoursPerWeek,
    hoursPerMonth,
    occupancyReal,
    billableHoursMonth,
    faturamentoAlvoRaw,
    floorHourlyRaw,
    projectFloorRaw,
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

function mapImpactPctToStrength(impactPct) {
  if (impactPct >= 8) return "high";
  if (impactPct >= 3) return "medium";
  return "low";
}

function appendTraceDriver(drivers, driver, maxDrivers = MAX_TRACEABILITY_DRIVERS) {
  if (!driver || !isTraceabilityInputKeyV1(driver.inputKey)) return;
  if (!drivers.some((item) => item.inputKey === driver.inputKey)) {
    drivers.push({
      inputKey: driver.inputKey,
      strength: driver.strength || "medium",
      ...(driver.reasonCode ? { reasonCode: driver.reasonCode } : {}),
    });
  }
  if (drivers.length > maxDrivers) drivers.length = maxDrivers;
}

function mapExplainFactorToTraceDriver(factor) {
  if (!factor || !factor.code) return null;
  const inputKey = TRACEABILITY_REASON_TO_INPUT_KEY_V1[factor.code];
  if (!isTraceabilityInputKeyV1(inputKey)) return null;
  return {
    inputKey,
    strength: mapImpactPctToStrength(Number(factor.impactoPct) || 0),
    reasonCode: factor.code,
  };
}

function buildExplainTraceDrivers(explainFactors, maxDrivers = MAX_TRACEABILITY_DRIVERS) {
  const drivers = [];
  for (const factor of Array.isArray(explainFactors) ? explainFactors : []) {
    appendTraceDriver(drivers, mapExplainFactorToTraceDriver(factor), maxDrivers);
  }
  return drivers;
}

function buildFloorTraceDrivers(state, cfg, projectFloorRaw) {
  const candidates = [
    { inputKey: "projectHours", patch: { projectHours: cfg.defaultProjectHours } },
    { inputKey: "utilization", patch: { utilizationPct: 100 } },
    { inputKey: "targetIncome", patch: { targetIncome: 0 } },
    { inputKey: "monthlyCosts", patch: { monthlyCosts: 0 } },
    { inputKey: "taxRate", patch: { taxRate: 0 } },
    { inputKey: "profitMargin", patch: { profitMargin: 0 } },
    { inputKey: "buffer", patch: { buffer: 0 } },
  ];

  const deltas = candidates
    .map((candidate) => {
      const patchedState = { ...state, ...candidate.patch };
      const patchedCore = computeCoreFinancials(patchedState, cfg);
      const delta = Math.max(0, projectFloorRaw - patchedCore.projectFloorRaw);
      return {
        inputKey: candidate.inputKey,
        delta,
      };
    })
    .filter((item) => item.delta > 0)
    .sort((a, b) => {
      if (b.delta !== a.delta) return b.delta - a.delta;
      return a.inputKey.localeCompare(b.inputKey);
    });

  const drivers = [];
  for (const item of deltas) {
    const impactPct = projectFloorRaw > 0 ? (item.delta / projectFloorRaw) * 100 : 0;
    appendTraceDriver(drivers, {
      inputKey: item.inputKey,
      strength: mapImpactPctToStrength(impactPct),
    });
    if (drivers.length >= MAX_TRACEABILITY_DRIVERS) break;
  }

  return drivers;
}

function buildRiskTraceDrivers(state, cfg, guardrails, explainFactors) {
  const drivers = [];

  if (guardrails.floorBreached) {
    appendTraceDriver(drivers, {
      inputKey: "discount",
      strength: "high",
      reasonCode: "DISCOUNT_BELOW_FLOOR",
    });
  }

  if (guardrails.retainerWithoutVolume) {
    appendTraceDriver(drivers, {
      inputKey: "monthlyVolumeHours",
      strength: "high",
      reasonCode: "RETAINER_WITHOUT_VOLUME",
    });
    appendTraceDriver(drivers, {
      inputKey: "engagementModel",
      strength: "medium",
      reasonCode: "RETAINER_WITHOUT_VOLUME",
    });
  }

  if (guardrails.unclearScope) {
    appendTraceDriver(drivers, {
      inputKey: "scopeClarity",
      strength: "high",
      reasonCode: "UNCLEAR_SCOPE",
    });
  }

  if (guardrails.highRisk) {
    appendTraceDriver(drivers, {
      inputKey: "scopeRisk",
      strength: "high",
      reasonCode: "HIGH_SCOPE_RISK",
    });
    if (state.buffer < cfg.minBufferForHighRiskPct) {
      appendTraceDriver(drivers, {
        inputKey: "buffer",
        strength: "medium",
      });
    }
    if (state.profitMargin < cfg.minMarginForClosedUnclearScopePct) {
      appendTraceDriver(drivers, {
        inputKey: "profitMargin",
        strength: "medium",
        reasonCode: "LOW_MARGIN",
      });
    }
  }

  for (const explainDriver of buildExplainTraceDrivers(explainFactors, MAX_TRACEABILITY_DRIVERS)) {
    appendTraceDriver(drivers, explainDriver);
    if (drivers.length >= MAX_TRACEABILITY_DRIVERS) break;
  }

  return drivers;
}

function buildTraceability(state, cfg, context) {
  const explainDrivers = buildExplainTraceDrivers(context.explainFactors, MAX_TRACEABILITY_DRIVERS);

  const heroPriceDrivers = [];
  if (state.discountPct > 0) {
    appendTraceDriver(heroPriceDrivers, {
      inputKey: "discount",
      strength: state.discountPct >= 15 ? "high" : "medium",
      reasonCode: context.guardrails.floorBreached ? "DISCOUNT_BELOW_FLOOR" : undefined,
    });
  }
  for (const driver of explainDrivers) {
    appendTraceDriver(heroPriceDrivers, driver);
    if (heroPriceDrivers.length >= MAX_TRACEABILITY_DRIVERS) break;
  }

  const sustainablePriceDrivers = [];
  for (const driver of explainDrivers) {
    appendTraceDriver(sustainablePriceDrivers, driver);
    if (sustainablePriceDrivers.length >= MAX_TRACEABILITY_DRIVERS) break;
  }

  return {
    heroPrice: heroPriceDrivers,
    sustainablePrice: sustainablePriceDrivers,
    floorPrice: buildFloorTraceDrivers(state, cfg, context.projectFloorRaw),
    riskIndicator: buildRiskTraceDrivers(state, cfg, context.guardrails, context.explainFactors),
  };
}

export function computePricingEngineV1(input = {}, config = {}) {
  const cfg = { ...PRICING_ENGINE_V1_DEFAULTS, ...config };
  const state = sanitizeInput(input, cfg);

  const core = computeCoreFinancials(state, cfg);

  const premiumComponents = buildPremiumComponents(state, cfg);
  const sustainableProjectRaw = core.projectFloorRaw * (1 + premiumComponents.totalPremiumPct);
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
    floorBreached: projectAfterDiscountRaw < core.projectFloorRaw,
    highRisk: highRiskByScope || highRiskByBuffer || highRiskByClosedUnclear,
    unclearScope: state.scopeClarity === "unclear",
    retainerWithoutVolume:
      state.engagementModel === "retainer" &&
      state.monthlyVolumeHours < cfg.minRetainerVolumeHours,
  };

  const explainFactors = buildExplainFactors(core.projectFloorRaw, state, premiumComponents, cfg);

  return {
    contractVersion: PRICING_ENGINE_V1_CONTRACT_VERSION,
    pricingBand: {
      piso: roundMoney(core.projectFloorRaw),
      sustentavel: roundMoney(sustainableProjectRaw),
      ideal: roundMoney(idealProjectRaw),
    },
    rates: {
      hora: roundMoney(sustainableHourlyRaw),
      dia: roundMoney(dayRateRaw),
    },
    economics: {
      faturamentoAlvo: roundMoney(core.faturamentoAlvoRaw),
      horasFaturaveisMes: roundMoney(core.billableHoursMonth),
      ocupacaoReal: roundRatio(core.occupancyReal),
    },
    // Project totals are domain-owned so UI can stay display-only.
    project: {
      total: roundMoney(sustainableProjectRaw),
      estimatedHours: roundMoney(state.projectHours),
      discountPct: roundMoney(state.discountPct),
      discountImpact: roundMoney(projectDiscountImpactRaw),
      totalAfterDiscount: roundMoney(projectAfterDiscountRaw),
    },
    guardrails,
    explainFactors,
    traceability: buildTraceability(state, cfg, {
      guardrails,
      explainFactors,
      projectFloorRaw: core.projectFloorRaw,
    }),
  };
}
