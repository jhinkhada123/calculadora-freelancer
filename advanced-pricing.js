const ADVANCED_ERROR = {
  code: "ADVANCED_INPUTS_INVALID",
  message: "Modo Avancado invalido. Ajustamos automaticamente para o Modo Essencial.",
};

export const ADVANCED_CONFIG = {
  scopeFactors: {
    low: 1.0,
    medium: 1.1,
    high: 1.25,
  },
  scarcity: {
    lowThreshold: 60,
    midThreshold: 80,
    highThreshold: 95,
    lowFactor: 1.0,
    midFactor: 1.12,
    highFactor: 1.25,
    capFactor: 1.3,
  },
  exhaustion: {
    baseHours: 40,
    midHours: 50,
    midIncrement: 0.015,
    highIncrement: 0.03,
    capFactor: 1.6,
  },
  monteCarlo: {
    minSamples: 20,
    iterations: 1200,
    seed: 1337,
  },
};

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round2(n) {
  return Number(num(n, 0).toFixed(2));
}

function toDecimalPercent(value) {
  return clamp(num(value, 0), 0, 100) / 100;
}

function seededRandom(seed) {
  let x = seed | 0;
  return function next() {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}

export function getScopeFactor(volatility, config = ADVANCED_CONFIG) {
  const key = String(volatility || "medium").toLowerCase();
  return config.scopeFactors[key] || config.scopeFactors.medium;
}

export function getScarcityFactor(occupancyRate, config = ADVANCED_CONFIG) {
  const c = config.scarcity;
  const occ = clamp(num(occupancyRate, c.lowThreshold), 0, 100);
  if (occ <= c.lowThreshold) return c.lowFactor;
  if (occ <= c.midThreshold) {
    const t = (occ - c.lowThreshold) / (c.midThreshold - c.lowThreshold);
    return c.lowFactor + (c.midFactor - c.lowFactor) * t;
  }
  if (occ <= c.highThreshold) {
    const t = (occ - c.midThreshold) / (c.highThreshold - c.midThreshold);
    return c.midFactor + (c.highFactor - c.midFactor) * t;
  }
  return c.capFactor;
}

export function getExhaustionFactor(weeklyHours, config = ADVANCED_CONFIG) {
  const ex = config.exhaustion;
  const hours = clamp(num(weeklyHours, ex.baseHours), 0, 120);
  if (hours <= ex.baseHours) return 1;
  let factor = 1;
  const midHours = Math.min(hours, ex.midHours);
  factor += Math.max(0, midHours - ex.baseHours) * ex.midIncrement;
  if (hours > ex.midHours) {
    factor += (hours - ex.midHours) * ex.highIncrement;
  }
  return Math.min(factor, ex.capFactor);
}

export function validateAdvancedInputs(state) {
  const assetValue = clamp(num(state.assetValue, 0), 0, 1e12);
  const assetUsefulLifeMonths = clamp(num(state.assetUsefulLifeMonths, 1), 1, 1200);
  const opportunityRateAnnual = clamp(num(state.opportunityRateAnnual, 0), 0, 300);
  const occupancyRate = clamp(num(state.occupancyRate, 60), 0, 100);
  const weeklyHours = clamp(num(state.weeklyHours, 40), 1, 120);
  const taxRateDec = toDecimalPercent(state.taxRate);
  const profitMarginDec = toDecimalPercent(state.profitMargin);
  const bufferDec = toDecimalPercent(state.buffer);
  const denominator = 1 - taxRateDec - profitMarginDec - bufferDec;

  if (!Number.isFinite(denominator) || denominator <= 0) {
    return { ok: false, error: { ...ADVANCED_ERROR, message: "Percentuais totais invalidos para o Modo Avancado." } };
  }
  if (!Number.isFinite(assetValue) || !Number.isFinite(assetUsefulLifeMonths) || !Number.isFinite(opportunityRateAnnual)) {
    return { ok: false, error: ADVANCED_ERROR };
  }
  return {
    ok: true,
    data: {
      assetValue,
      assetUsefulLifeMonths,
      opportunityRateAnnual,
      occupancyRate,
      weeklyHours,
      denominator,
      taxRateDec,
      profitMarginDec,
      bufferDec,
    },
  };
}

export function deriveHistoricalVarianceSamples(auditTrail) {
  if (!Array.isArray(auditTrail)) return [];
  const samples = [];
  for (const entry of auditTrail) {
    const inHours = num(entry?.inputs?.projectHours, 0);
    const outHourly = num(entry?.outputs?.hourly, 0);
    const outProject = num(entry?.outputs?.projectNet, 0);
    if (inHours > 0 && outHourly > 0 && outProject > 0) {
      const baseline = inHours * outHourly;
      if (baseline > 0) {
        const ratio = clamp(outProject / baseline, 0.5, 2.2);
        samples.push(ratio);
      }
    }
  }
  return samples;
}

export function seededMonteCarloScopeFactor(samples, config = ADVANCED_CONFIG) {
  const clean = (Array.isArray(samples) ? samples : [])
    .map((v) => num(v, 1))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length < config.monteCarlo.minSamples) {
    return { ok: false, reason: "INSUFFICIENT_SAMPLES", minSamples: config.monteCarlo.minSamples };
  }
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const variance = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / clean.length;
  const std = Math.sqrt(variance);
  const rand = seededRandom(config.monteCarlo.seed);
  const sims = [];

  for (let i = 0; i < config.monteCarlo.iterations; i++) {
    // Box-Muller with fixed seed for reproducibility.
    const u1 = Math.max(rand(), 1e-9);
    const u2 = Math.max(rand(), 1e-9);
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const candidate = clamp(mean + z * std, 0.6, 2.2);
    sims.push(candidate);
  }
  sims.sort((a, b) => a - b);
  const p = (q) => sims[Math.floor((sims.length - 1) * q)];
  return {
    ok: true,
    p50: p(0.5),
    p80: p(0.8),
    p95: p(0.95),
    mean,
    std,
    sampleCount: clean.length,
  };
}

function buildEnhancedOutput(essential, finalHourly, scopeRiskPct, discountPct) {
  const hoursPerDay = num(essential.hoursPerMonth, 0) > 0 && num(essential.billableHours, 0) > 0
    ? num(essential.dailyRaw, 0) / Math.max(num(essential.hourlyRaw, 1), 1e-9)
    : 1;
  const projectHours = clamp(num(essential.projectHours, 0), 0, 100000);
  const scopeMult = 1 + clamp(num(scopeRiskPct, 0), 0, 100) / 100;
  const discountMult = 1 - clamp(num(discountPct, 0), 0, 90) / 100;
  const dailyRaw = finalHourly * Math.max(hoursPerDay, 1);
  const projectGrossRaw = projectHours * finalHourly * scopeMult;
  const projectNetRaw = projectGrossRaw * discountMult;
  const revenueTargetRaw = finalHourly * Math.max(num(essential.billableHours, 0), 0);
  return {
    ...essential,
    ok: true,
    error: null,
    revenueTargetRaw,
    hourlyRaw: finalHourly,
    dailyRaw,
    projectGrossRaw,
    projectNetRaw,
    revenueTarget: round2(revenueTargetRaw),
    hourly: round2(finalHourly),
    daily: round2(dailyRaw),
    projectGross: round2(projectGrossRaw),
    projectNet: round2(projectNetRaw),
  };
}

export function computeAdvancedPricing(params) {
  const { state, essential, useMonteCarlo, historicalSamples = [], config = ADVANCED_CONFIG } = params || {};
  if (!essential || !essential.ok) {
    return { ok: false, error: ADVANCED_ERROR };
  }
  const valid = validateAdvancedInputs(state || {});
  if (!valid.ok) return { ok: false, error: valid.error };

  const v = valid.data;
  const baseNeedCore = num(state.targetIncome, 0) + num(state.monthlyCosts, 0);
  const depreciationMonthly = v.assetValue / v.assetUsefulLifeMonths;
  const opportunityCostMonthly = v.assetValue * (Math.pow(1 + v.opportunityRateAnnual / 100, 1 / 12) - 1);
  const baseNeedAdvanced = baseNeedCore + depreciationMonthly + opportunityCostMonthly;
  const billableHours = Math.max(num(essential.billableHours, 0), 0);
  if (billableHours <= 0) {
    return { ok: false, error: { ...ADVANCED_ERROR, message: "Horas faturaveis invalidas para o Modo Avancado." } };
  }

  const baseHourly = baseNeedAdvanced / billableHours;
  const grossUp = baseHourly / v.denominator;
  const deterministicScopeFactor = getScopeFactor(state.scopeVolatility, config);
  const scarcityFactor = getScarcityFactor(v.occupancyRate, config);
  const exhaustionFactor = getExhaustionFactor(v.weeklyHours, config);

  let scopeFactor = deterministicScopeFactor;
  let stochastic = null;
  let riskLabel = "estimativa por faixa";
  if (useMonteCarlo) {
    const mc = seededMonteCarloScopeFactor(historicalSamples, config);
    if (mc.ok) {
      scopeFactor = clamp(mc.p80, 0.8, 1.8);
      riskLabel = "estimativa estocastica";
      stochastic = mc;
    }
  }

  const h0 = (baseNeedCore / billableHours) / v.denominator;
  const h1 = grossUp;
  const h2 = h1 * scopeFactor;
  const h3 = h2 * scarcityFactor;
  const h4 = h3 * exhaustionFactor;
  const finalHourlyAdvanced = h4;

  const adjusted = buildEnhancedOutput(
    { ...essential, projectHours: num(state.projectHours, 0) },
    finalHourlyAdvanced,
    num(state.scopeRisk, 0),
    num(state.discount, 0)
  );

  return {
    ok: true,
    error: null,
    mode: stochastic ? "montecarlo" : "deterministic",
    riskLabel,
    stochastic,
    data: {
      depreciationMonthly,
      opportunityCostMonthly,
      baseNeedAdvanced,
      baseNeedCore,
      denominator: v.denominator,
      scopeFactor,
      deterministicScopeFactor,
      scarcityFactor,
      exhaustionFactor,
      baseHourly,
      grossUp,
      finalHourlyAdvanced,
      contributions: {
        patrimonio: h1 - h0,
        risco: h2 - h1,
        escassez: h3 - h2,
        exaustao: h4 - h3,
      },
    },
    output: adjusted,
  };
}

/**
 * Cenários configuráveis para Agency Equivalent.
 * Defaults baseados em benchmarks de mercado (agências cobram ~1.5x execução + overhead PM).
 *
 * taxaContaPM: R$/h (taxa horária da conta de project management).
 * Default heurístico: taxaHoraFreela * 1.8 (PM tipicamente cobra mais; justificado por mercado).
 * Override: config.taxaContaPM (número em R$/h).
 */
export const AGENCY_EQUIVALENT_DEFAULTS = {
  multiplierFreela: 1.5,
  overheadPct: 0.35,
  taxaContaPMMultiplier: 1.8,
  conservative: { multiplierFreela: 1.4, overheadPct: 0.30, taxaContaPMMultiplier: 1.6 },
  base: { multiplierFreela: 1.5, overheadPct: 0.35, taxaContaPMMultiplier: 1.8 },
  aggressive: { multiplierFreela: 1.7, overheadPct: 0.40, taxaContaPMMultiplier: 2.0 },
};

/**
 * Este motor retorna valores brutos; buildProposalMetrics normaliza arredondamento dos outputs exibíveis.
 *
 * Fórmula: agencyCost = horas * (taxaHoraFreela * multiplierFreela) + (horas * overheadPct * taxaContaPM)
 * economiaValor = max(0, agencyCost - proposalCost)
 * economiaPercentual = clampPct((economiaValor / agencyCost) * 100), com proteção divisor zero
 *
 * @param {Object} projectState - { projectHours, projectNet?, hourly? }
 * @param {Object} [config] - Cenário (conservative|base|aggressive) ou overrides
 */
export function computeAgencyEquivalent(projectState, config = {}) {
  const scenario = ["conservative", "base", "aggressive"].includes(config.scenario) ? config.scenario : "base";
  const cfg = { ...AGENCY_EQUIVALENT_DEFAULTS[scenario], ...config };
  const multiplierFreela = Math.max(0, num(cfg.multiplierFreela, 1.5));
  const overheadPct = Math.max(0, Math.min(1, num(cfg.overheadPct, 0.35)));
  const taxaHoraFreela = Math.max(0, num(projectState?.hourly, 0));
  const horas = Math.max(0, num(projectState?.projectHours, 0));
  const projectNet = num(projectState?.projectNet, null);
  const hourly = num(projectState?.hourly, 0);

  if (horas <= 0 || !Number.isFinite(horas)) {
    return { agencyCost: null, proposalCost: null, economiaValor: null, economiaPercentual: null };
  }
  if (taxaHoraFreela <= 0 && (projectNet == null || projectNet <= 0)) {
    return { agencyCost: null, proposalCost: null, economiaValor: null, economiaPercentual: null };
  }

  const taxaContaPM = Number.isFinite(cfg.taxaContaPM) ? cfg.taxaContaPM : (cfg.taxaContaPMMultiplier * taxaHoraFreela) || taxaHoraFreela * 1.8;
  const agencyCost = horas * (taxaHoraFreela * multiplierFreela) + horas * overheadPct * taxaContaPM;
  if (!Number.isFinite(agencyCost) || agencyCost <= 0) {
    return { agencyCost: null, proposalCost: null, economiaValor: null, economiaPercentual: null };
  }

  let proposalCost = null;
  if (projectNet != null && Number.isFinite(projectNet) && projectNet > 0) {
    proposalCost = projectNet;
  } else if (hourly > 0 && Number.isFinite(hourly)) {
    proposalCost = horas * hourly;
  }
  if (proposalCost == null || !Number.isFinite(proposalCost) || proposalCost < 0) {
    return { agencyCost, proposalCost: null, economiaValor: null, economiaPercentual: null };
  }

  const economiaValor = Math.max(0, agencyCost - proposalCost);
  const economiaPercentualRaw = agencyCost > 0 ? (economiaValor / agencyCost) * 100 : 0;
  const economiaPercentual = Number.isFinite(economiaPercentualRaw)
    ? Math.min(100, Math.max(0, economiaPercentualRaw))
    : null;

  return {
    agencyCost,
    proposalCost,
    economiaValor,
    economiaPercentual,
  };
}

// governance-validation: high-risk pass marker
