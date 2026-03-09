import { computePricingEngineV1 } from "../../src/domain/pricing/engine-v1.js";
import {
  TRACEABILITY_INPUT_KEYS_V1,
  TRACEABILITY_METRICS_V1,
  isTraceabilityInputKeyV1,
} from "../../src/domain/pricing/traceability-v1.js";

const INPUT = {
  targetIncome: 9000,
  monthlyCosts: 1200,
  taxRate: 10,
  profitMargin: 8,
  buffer: 6,
  utilization: 45,
  hoursPerDay: 6,
  daysPerWeek: 5,
  vacationWeeks: 4,
  scopeRisk: 80,
  discount: 18,
  projectHours: 40,
  scopeClarity: "unclear",
  urgentDeadline: true,
  revisionLoad: "high",
  engagementModel: "retainer",
  monthlyVolumeHours: 8,
};

describe("pricing engine v1 traceability", () => {
  test("returns traceability map for supported metrics", () => {
    const result = computePricingEngineV1(INPUT);

    expect(result.traceability).toBeTruthy();
    expect(Object.keys(result.traceability)).toEqual(TRACEABILITY_METRICS_V1);
  });

  test("limits each metric to max 3 drivers with valid input keys", () => {
    const result = computePricingEngineV1(INPUT);

    TRACEABILITY_METRICS_V1.forEach((metric) => {
      const drivers = result.traceability[metric];
      expect(Array.isArray(drivers)).toBe(true);
      expect(drivers.length).toBeLessThanOrEqual(3);
      drivers.forEach((driver) => {
        expect(isTraceabilityInputKeyV1(driver.inputKey)).toBe(true);
        expect(TRACEABILITY_INPUT_KEYS_V1.includes(driver.inputKey)).toBe(true);
        expect(["high", "medium", "low"]).toContain(driver.strength);
      });
    });
  });

  test("is deterministic for same input", () => {
    const first = computePricingEngineV1(INPUT);
    const second = computePricingEngineV1(INPUT);

    expect(second.traceability).toEqual(first.traceability);
  });

  test("risk indicator includes guardrail-backed drivers when active", () => {
    const result = computePricingEngineV1(INPUT);
    const keys = result.traceability.riskIndicator.map((driver) => driver.inputKey);

    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain("monthlyVolumeHours");
  });
});
