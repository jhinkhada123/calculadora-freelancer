export const PRICING_TRACE_METRICS_V1 = Object.freeze([
  "heroPrice",
  "sustainablePrice",
  "floorPrice",
  "riskIndicator",
]);

export const PRICING_TRACEABLE_INPUT_KEYS_V1 = Object.freeze([
  "projectHours",
  "scopeRisk",
  "discount",
  "scopeClarity",
  "revisionLoad",
  "urgentDeadline",
  "engagementModel",
  "monthlyVolumeHours",
  "utilization",
  "profitMargin",
  "buffer",
  "occupancyRate",
  "targetIncome",
  "monthlyCosts",
  "taxRate",
]);

export const PRICING_IMPACT_PREVIEW_INPUT_KEYS_V1 = Object.freeze([
  "discount",
  "scopeClarity",
  "revisionLoad",
  "urgentDeadline",
  "scopeRisk",
]);

export const PRICING_TRACE_REASON_CODE_BY_INPUT_KEY_V1 = Object.freeze({
  utilization: "LOW_OCCUPANCY",
  occupancyRate: "LOW_OCCUPANCY",
  scopeRisk: "HIGH_SCOPE_RISK",
  scopeClarity: "UNCLEAR_SCOPE",
  urgentDeadline: "URGENT_DEADLINE",
  revisionLoad: "HIGH_REVISION_LOAD",
  profitMargin: "LOW_MARGIN",
  discount: "DISCOUNT_BELOW_FLOOR",
  monthlyVolumeHours: "RETAINER_WITHOUT_VOLUME",
});

const DRIVER_STRENGTH_BY_INDEX = Object.freeze(["high", "medium", "low"]);

export function isPricingTraceMetricV1(value) {
  return PRICING_TRACE_METRICS_V1.includes(value);
}

export function isPricingTraceableInputKeyV1(value) {
  return PRICING_TRACEABLE_INPUT_KEYS_V1.includes(value);
}

export function isPricingImpactPreviewInputKeyV1(value) {
  return PRICING_IMPACT_PREVIEW_INPUT_KEYS_V1.includes(value);
}

function compareImpactCandidates(a, b) {
  const delta = b.impact - a.impact;
  if (Math.abs(delta) > 0.00001) return delta;
  return a.inputKey.localeCompare(b.inputKey);
}

export function selectTopTraceDriversV1(candidates, maxDrivers = 3) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const normalized = candidates
    .filter((candidate) => {
      return candidate &&
        isPricingTraceableInputKeyV1(candidate.inputKey) &&
        Number.isFinite(Number(candidate.impact)) &&
        Number(candidate.impact) > 0;
    })
    .map((candidate) => ({
      inputKey: candidate.inputKey,
      impact: Number(candidate.impact),
      reasonCode: candidate.reasonCode || PRICING_TRACE_REASON_CODE_BY_INPUT_KEY_V1[candidate.inputKey],
    }))
    .sort(compareImpactCandidates)
    .slice(0, Math.max(1, maxDrivers));

  return normalized.map((candidate, index) => ({
    inputKey: candidate.inputKey,
    strength: DRIVER_STRENGTH_BY_INDEX[index] || "low",
    ...(candidate.reasonCode ? { reasonCode: candidate.reasonCode } : {}),
  }));
}
