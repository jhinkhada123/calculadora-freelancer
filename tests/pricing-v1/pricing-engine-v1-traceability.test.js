import { computePricingEngineV1 } from "../../src/domain/pricing/engine-v1.js";
import {
  PRICING_TRACE_METRICS_V1,
  isPricingTraceMetricV1,
  isPricingTraceableInputKeyV1,
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
  discount: 12,
  projectHours: 40,
  scopeClarity: "unclear",
  urgentDeadline: true,
  revisionLoad: "high",
  engagementModel: "project",
  monthlyVolumeHours: 0,
};

describe("pricing engine v1 traceability", () => {
  test("exposes deterministic drivers with max 3 entries per metric", () => {
    const result = computePricingEngineV1(INPUT);

    expect(result.traceability).toBeDefined();

    for (const metric of PRICING_TRACE_METRICS_V1) {
      expect(isPricingTraceMetricV1(metric)).toBe(true);
      const drivers = result.traceability[metric];
      expect(Array.isArray(drivers)).toBe(true);
      expect(drivers.length).toBeLessThanOrEqual(3);

      for (const driver of drivers) {
        expect(isPricingTraceableInputKeyV1(driver.inputKey)).toBe(true);
        expect(["high", "medium", "low"].includes(driver.strength)).toBe(true);
      }
    }

    expect(result.traceability.heroPrice.length).toBeGreaterThan(0);
    expect(result.traceability.riskIndicator.length).toBeGreaterThan(0);
  });

  test("keeps stable ordering for same input", () => {
    const a = computePricingEngineV1(INPUT).traceability;
    const b = computePricingEngineV1(INPUT).traceability;

    expect(a).toEqual(b);
  });
});
