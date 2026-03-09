import { computePricingEngineV1 } from "../../src/domain/pricing/engine-v1.js";
import {
  PRICING_IMPACT_PREVIEW_INPUT_KEYS_V1,
  isPricingImpactPreviewInputKeyV1,
  isPricingTraceMetricV1,
} from "../../src/domain/pricing/traceability-v1.js";

const INPUT = {
  targetIncome: 9000,
  monthlyCosts: 1200,
  taxRate: 10,
  profitMargin: 20,
  buffer: 10,
  utilization: 70,
  hoursPerDay: 6,
  daysPerWeek: 5,
  vacationWeeks: 4,
  scopeRisk: 20,
  discount: 10,
  projectHours: 40,
  scopeClarity: "clear",
  urgentDeadline: false,
  revisionLoad: "medium",
  engagementModel: "project",
  monthlyVolumeHours: 0,
};

describe("pricing engine v1 impact preview", () => {
  test("returns approved preview map with deterministic deltas", () => {
    const result = computePricingEngineV1(INPUT);
    const preview = result.impactPreview;

    for (const inputKey of PRICING_IMPACT_PREVIEW_INPUT_KEYS_V1) {
      expect(isPricingImpactPreviewInputKeyV1(inputKey)).toBe(true);
      const delta = preview[inputKey];

      expect(delta).toBeDefined();
      expect(delta.inputKey).toBe(inputKey);
      expect(isPricingTraceMetricV1(delta.metric)).toBe(true);
      expect(typeof delta.deltaValue).toBe("number");
      expect(typeof delta.deltaPct).toBe("number");
      expect(["up", "down", "neutral"].includes(delta.direction)).toBe(true);
    }

    const previewAgain = computePricingEngineV1(INPUT).impactPreview;
    expect(preview).toEqual(previewAgain);
  });

  test("discount preview reflects engine-backed pressure", () => {
    const preview = computePricingEngineV1(INPUT).impactPreview.discount;

    expect(preview.metric).toBe("sustainablePrice");
    expect(preview.direction).toBe("down");
    expect(preview.deltaValue).toBeLessThan(0);
  });
});
