export const TRACEABILITY_INPUT_KEYS_V1 = Object.freeze([
  "targetIncome",
  "monthlyCosts",
  "taxRate",
  "profitMargin",
  "buffer",
  "utilization",
  "hoursPerDay",
  "daysPerWeek",
  "vacationWeeks",
  "projectHours",
  "scopeRisk",
  "discount",
  "scopeClarity",
  "urgentDeadline",
  "revisionLoad",
  "engagementModel",
  "monthlyVolumeHours",
]);

export const TRACEABILITY_METRICS_V1 = Object.freeze([
  "heroPrice",
  "sustainablePrice",
  "floorPrice",
  "riskIndicator",
]);

export const TRACEABILITY_REASON_TO_INPUT_KEY_V1 = Object.freeze({
  LOW_OCCUPANCY: "utilization",
  HIGH_SCOPE_RISK: "scopeRisk",
  UNCLEAR_SCOPE: "scopeClarity",
  URGENT_DEADLINE: "urgentDeadline",
  HIGH_REVISION_LOAD: "revisionLoad",
  LOW_MARGIN: "profitMargin",
  DISCOUNT_BELOW_FLOOR: "discount",
  RETAINER_WITHOUT_VOLUME: "monthlyVolumeHours",
});

const INPUT_KEY_SET = new Set(TRACEABILITY_INPUT_KEYS_V1);
const METRIC_SET = new Set(TRACEABILITY_METRICS_V1);

export function isTraceabilityInputKeyV1(value) {
  return INPUT_KEY_SET.has(String(value || ""));
}

export function isTraceabilityMetricV1(value) {
  return METRIC_SET.has(String(value || ""));
}
