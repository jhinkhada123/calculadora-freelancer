export const PRICING_REASON_CODES_V1 = Object.freeze([
  "LOW_OCCUPANCY",
  "HIGH_SCOPE_RISK",
  "UNCLEAR_SCOPE",
  "URGENT_DEADLINE",
  "HIGH_REVISION_LOAD",
  "LOW_MARGIN",
  "DISCOUNT_BELOW_FLOOR",
  "RETAINER_WITHOUT_VOLUME",
]);

export const PRICING_REASON_CODE_CATALOG_V1 = Object.freeze({
  LOW_OCCUPANCY: Object.freeze({
    severity: "warning",
    owner: "pricing-engine-v1",
    blocking: false,
  }),
  HIGH_SCOPE_RISK: Object.freeze({
    severity: "critical",
    owner: "pricing-engine-v1",
    blocking: true,
  }),
  UNCLEAR_SCOPE: Object.freeze({
    severity: "critical",
    owner: "pricing-engine-v1",
    blocking: true,
  }),
  URGENT_DEADLINE: Object.freeze({
    severity: "warning",
    owner: "pricing-engine-v1",
    blocking: false,
  }),
  HIGH_REVISION_LOAD: Object.freeze({
    severity: "warning",
    owner: "pricing-engine-v1",
    blocking: false,
  }),
  LOW_MARGIN: Object.freeze({
    severity: "warning",
    owner: "pricing-engine-v1",
    blocking: false,
  }),
  DISCOUNT_BELOW_FLOOR: Object.freeze({
    severity: "critical",
    owner: "pricing-engine-v1",
    blocking: true,
  }),
  RETAINER_WITHOUT_VOLUME: Object.freeze({
    severity: "critical",
    owner: "pricing-engine-v1",
    blocking: true,
  }),
});

export function isPricingReasonCodeV1(value) {
  return PRICING_REASON_CODES_V1.includes(value);
}
