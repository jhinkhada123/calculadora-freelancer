import { PRICING_REASON_CODES_V1, PRICING_REASON_CODE_CATALOG_V1, isPricingReasonCodeV1 } from "../../src/domain/pricing/reason-codes-v1.js";

describe("pricing reason codes v1", () => {
  test("catalog and list are aligned", () => {
    const keys = Object.keys(PRICING_REASON_CODE_CATALOG_V1);
    expect(keys.sort()).toEqual([...PRICING_REASON_CODES_V1].sort());
  });

  test("validator accepts only catalog values", () => {
    for (const code of PRICING_REASON_CODES_V1) {
      expect(isPricingReasonCodeV1(code)).toBe(true);
    }
    expect(isPricingReasonCodeV1("UNKNOWN_CODE")).toBe(false);
  });
});
