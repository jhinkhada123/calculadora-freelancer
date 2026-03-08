import {
  TRACEABILITY_INPUT_KEYS_V1,
  TRACEABILITY_METRICS_V1,
  TRACEABILITY_REASON_TO_INPUT_KEY_V1,
  isTraceabilityInputKeyV1,
  isTraceabilityMetricV1,
} from "../../src/domain/pricing/traceability-v1.js";

describe("traceability v1 vocabulary", () => {
  test("exports canonical metrics in fixed order", () => {
    expect(TRACEABILITY_METRICS_V1).toEqual([
      "heroPrice",
      "sustainablePrice",
      "floorPrice",
      "riskIndicator",
    ]);
  });

  test("all reason mappings point to valid input keys", () => {
    Object.values(TRACEABILITY_REASON_TO_INPUT_KEY_V1).forEach((key) => {
      expect(TRACEABILITY_INPUT_KEYS_V1.includes(key)).toBe(true);
      expect(isTraceabilityInputKeyV1(key)).toBe(true);
    });
  });

  test("guards validate known and unknown keys", () => {
    expect(isTraceabilityInputKeyV1("projectHours")).toBe(true);
    expect(isTraceabilityInputKeyV1("invalidKey")).toBe(false);
    expect(isTraceabilityMetricV1("heroPrice")).toBe(true);
    expect(isTraceabilityMetricV1("invalidMetric")).toBe(false);
  });
});
