/**
 * Fonte única da verdade para proposalMetrics.
 * Único lugar que monta schemaVersion, clientSafe, internalOnly, debug?.
 * Proíbe montagem espalhada de payload client-facing.
 *
 * Regra: buildProposalMetrics aplica feature flags e retorna null (não omitir)
 * quando OFF, mantendo payload estável.
 *
 * Feature flags: importados de feature-flags.js (fonte única).
 */

import { resolveFeatureFlags } from "./feature-flags.js";

/** @type {ReadonlySet<string>} Whitelist explícita de chaves permitidas em clientSafe */
export const CLIENT_SAFE_KEYS = new Set([
  "schemaVersion",
  "revenueTarget",
  "hourly",
  "daily",
  "projectGross",
  "projectNet",
  "currency",
  "projectHours",
  "scopeRisk",
  "discount",
  "proposalMode",
  "validityDate",
  "professionalName",
  "clientName",
  // Agency (quando agency_enabled)
  "agencyEconomiaValor",
  "agencyEconomiaPercentual",
  "agencyCost",
  "proposalCost",
  // Inação (quando inacao_enabled)
  "custoInacaoSemanal",
  "custoInacaoMensal",
  "vcePct",
  "valorGanhoEstimado12m",
  // Tiers (quando tiers_enabled)
  "tierEnxuto",
  "tierEssencial",
  "tierPremium",
]);

/**
 * Subconjunto de CLIENT_SAFE_KEYS para export/share público.
 * Exclui PII (professionalName, clientName).
 * Nunca inclui internalOnly.
 */
export const PUBLIC_EXPORT_KEYS = new Set(
  [...CLIENT_SAFE_KEYS].filter((k) => k !== "professionalName" && k !== "clientName")
);

export const SHARE_KEYS = PUBLIC_EXPORT_KEYS;

/**
 * Extrai apenas chaves seguras para export/share público (sem PII).
 */
export function pickPublicExportSafe(obj) {
  return pickClientSafe(obj, PUBLIC_EXPORT_KEYS);
}

// --- Helpers numéricos (0.1) ---

/**
 * Retorna número finito ou fallback. Evita NaN/Infinity em fórmulas.
 */
export function toFiniteNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

/** Dinheiro: 2 casas decimais */
export function roundMoney(x) {
  return Number(toFiniteNumber(x, 0).toFixed(2));
}

/** Percentual: 1 casa decimal */
export function roundPct(x) {
  return Number(toFiniteNumber(x, 0).toFixed(1));
}

/** Percentual clampado 0..100 */
export function clampPct(x) {
  return Math.min(100, Math.max(0, toFiniteNumber(x, 0)));
}

// --- Whitelist e assert ---

/**
 * Extrai apenas chaves da whitelist. Outputs client-facing só consomem clientSafe.
 */
export function pickClientSafe(obj, keys = CLIENT_SAFE_KEYS) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const k of Object.keys(obj)) {
    if (keys.has(k) && Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k];
    }
  }
  return out;
}

const COLLECT_PATHS_MAX_DEPTH = 20;

/**
 * Coleta todos os paths (chave e path aninhado) de um objeto, incluindo arrays.
 * Usa WeakSet visited para ciclos e limite de profundidade.
 * Ex.: { a: 1, b: { c: 2 }, arr: [{ x: 1 }] } => ['a', 'b', 'b.c', 'arr', 'arr.0', 'arr.0.x']
 */
function collectPaths(obj, prefix = "", depth = 0, visited = new WeakSet()) {
  const paths = [];
  if (obj == null || typeof obj !== "object") return paths;
  if (depth >= COLLECT_PATHS_MAX_DEPTH) return paths;
  try {
    if (visited.has(obj)) return paths;
    visited.add(obj);
  } catch (_) {
    return paths;
  }
  const keys = Array.isArray(obj) ? Object.keys(obj).filter((k) => /^\d+$/.test(k)) : Object.keys(obj);
  for (const k of keys) {
    const path = prefix ? `${prefix}.${k}` : k;
    paths.push(path);
    const v = obj[k];
    if (v != null && typeof v === "object") {
      paths.push(...collectPaths(v, path, depth + 1, visited));
    }
  }
  return paths;
}

/** Chaves top-level de internalOnly (para colisão restrita). */
function getInternalTopLevelKeys(obj) {
  if (!obj || typeof obj !== "object") return new Set();
  return new Set(Object.keys(obj));
}

/**
 * Runtime: verifica que nenhuma chave/path de internalOnly aparece em clientSafe.
 * - Valida por paths completos (ex.: batna.level, batna.message).
 * - Valida colisão só de top-level keys de internalOnly.
 * - Key-name scan limitado a top-level (não recursivo).
 */
export function assertNoLeakage(internalOnly, clientSafe) {
  if (!internalOnly || typeof internalOnly !== "object") return;
  const internalPaths = new Set(collectPaths(internalOnly));
  const internalTopLevel = getInternalTopLevelKeys(internalOnly);
  const clientPaths = clientSafe ? collectPaths(clientSafe) : [];
  for (const p of clientPaths) {
    if (internalPaths.has(p)) {
      throw new Error(`Leakage: internalOnly path "${p}" found in clientSafe`);
    }
    const segments = p.split(".");
    const topKey = segments[0];
    if (internalTopLevel.has(topKey)) {
      throw new Error(`Leakage: internalOnly top-level key "${topKey}" found in clientSafe (path "${p}")`);
    }
    for (const seg of segments) {
      if (internalTopLevel.has(seg)) {
        throw new Error(`Leakage: internalOnly key "${seg}" found in clientSafe (path "${p}")`);
      }
    }
  }
}

// --- Feature flags: re-export para compatibilidade de testes ---
export { FEATURE_FLAGS_DEFAULTS } from "./feature-flags.js";

// --- Contrato proposalMetrics ---

/**
 * @typedef {Object} ProposalMetrics
 * @property {number} schemaVersion
 * @property {Object} clientSafe - Apenas chaves da whitelist; seguro para cliente/URL/export
 * @property {Object} internalOnly - Nunca em URL, export, PDF cliente, ?view=client
 * @property {Object} [debug] - Opcional, apenas se flag habilitada
 */

/**
 * Fonte única da verdade. Monta proposalMetrics aplicando flags e normalização.
 * Valores exibíveis: dinheiro 2 casas, percentual 1 casa; não aplicável = null.
 *
 * @param {Object} state - Estado da UI
 * @param {Object} outputs - Outputs brutos dos motores (calculadora, agency, inação, batna, tiers)
 * @param {Object} [flags] - Feature flags (default OFF)
 * @returns {ProposalMetrics}
 */
export function buildProposalMetrics(state, outputs, flags = {}) {
  const fl = resolveFeatureFlags(flags);
  const schemaVersion = 1;

  const clientSafe = {
    schemaVersion,
    revenueTarget: outputs?.essential?.revenueTarget ?? null,
    hourly: outputs?.essential?.hourly ?? null,
    daily: outputs?.essential?.daily ?? null,
    projectGross: outputs?.essential?.projectGross ?? null,
    projectNet: outputs?.essential?.projectNet ?? null,
    currency: state?.currency ?? "BRL",
    projectHours: toFiniteNumber(state?.projectHours, 0) || null,
    scopeRisk: toFiniteNumber(state?.scopeRisk, 0) ?? null,
    discount: toFiniteNumber(state?.discount, 0) ?? null,
    proposalMode: !!state?.proposalMode,
    validityDate: state?.validityDate ?? null,
    professionalName: state?.professionalName ?? null,
    clientName: state?.clientName ?? null,
  };

  // Normalizar valores exibíveis: dinheiro roundMoney(2 casas), percentuais roundPct(1 casa)
  if (clientSafe.revenueTarget != null) clientSafe.revenueTarget = roundMoney(clientSafe.revenueTarget);
  if (clientSafe.hourly != null) clientSafe.hourly = roundMoney(clientSafe.hourly);
  if (clientSafe.daily != null) clientSafe.daily = roundMoney(clientSafe.daily);
  if (clientSafe.projectGross != null) clientSafe.projectGross = roundMoney(clientSafe.projectGross);
  if (clientSafe.projectNet != null) clientSafe.projectNet = roundMoney(clientSafe.projectNet);
  if (clientSafe.scopeRisk != null && typeof clientSafe.scopeRisk === "number") clientSafe.scopeRisk = roundPct(clampPct(clientSafe.scopeRisk));
  if (clientSafe.discount != null && typeof clientSafe.discount === "number") clientSafe.discount = roundPct(clampPct(clientSafe.discount));

  const internalOnly = {};

  // Agency (flag OFF = manter chave, valor null)
  if (fl.agency_enabled && outputs?.agency) {
    clientSafe.agencyEconomiaValor = outputs.agency.economiaValor != null ? roundMoney(outputs.agency.economiaValor) : null;
    clientSafe.agencyEconomiaPercentual = outputs.agency.economiaPercentual != null ? roundPct(clampPct(outputs.agency.economiaPercentual)) : null;
    clientSafe.agencyCost = outputs.agency.agencyCost != null ? roundMoney(outputs.agency.agencyCost) : null;
    clientSafe.proposalCost = outputs.agency.proposalCost != null ? roundMoney(outputs.agency.proposalCost) : null;
  } else {
    clientSafe.agencyEconomiaValor = null;
    clientSafe.agencyEconomiaPercentual = null;
    clientSafe.agencyCost = null;
    clientSafe.proposalCost = null;
  }

  // Inação (flag OFF = null)
  if (fl.inacao_enabled && outputs?.inacao) {
    clientSafe.custoInacaoSemanal = outputs.inacao.custoInacaoSemanal != null ? roundMoney(outputs.inacao.custoInacaoSemanal) : null;
    clientSafe.custoInacaoMensal = outputs.inacao.custoInacaoMensal != null ? roundMoney(outputs.inacao.custoInacaoMensal) : null;
    clientSafe.vcePct = outputs.inacao.vcePct != null ? roundPct(clampPct(outputs.inacao.vcePct)) : null;
    clientSafe.valorGanhoEstimado12m = outputs.inacao.valorGanhoEstimado12m != null ? roundMoney(outputs.inacao.valorGanhoEstimado12m) : null;
  } else {
    clientSafe.custoInacaoSemanal = null;
    clientSafe.custoInacaoMensal = null;
    clientSafe.vcePct = null;
    clientSafe.valorGanhoEstimado12m = null;
  }

  // BATNA: sempre em internalOnly, nunca em clientSafe
  if (fl.batna_enabled && outputs?.batna) {
    internalOnly.batnaLevel = outputs.batna.batnaLevel ?? null;
    internalOnly.batnaMessage = outputs.batna.batnaMessage ?? null;
  } else {
    internalOnly.batnaLevel = null;
    internalOnly.batnaMessage = null;
  }

  // Tiers (flag OFF = null)
  if (fl.tiers_enabled && outputs?.tiers) {
    clientSafe.tierEnxuto = outputs.tiers.enxuto != null ? roundMoney(outputs.tiers.enxuto) : null;
    clientSafe.tierEssencial = outputs.tiers.essencial != null ? roundMoney(outputs.tiers.essencial) : null;
    clientSafe.tierPremium = outputs.tiers.premium != null ? roundMoney(outputs.tiers.premium) : null;
  } else {
    clientSafe.tierEnxuto = null;
    clientSafe.tierEssencial = null;
    clientSafe.tierPremium = null;
  }

  return {
    schemaVersion,
    clientSafe: pickClientSafe(clientSafe, CLIENT_SAFE_KEYS),
    internalOnly,
    debug: fl.debug_enabled ? outputs?.debug : undefined,
  };
}
