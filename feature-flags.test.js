import { FEATURE_FLAGS_DEFAULTS, resolveFeatureFlags } from "./feature-flags.js";

describe("feature-flags", () => {
  test("resolveFeatureFlags retorna defaults sem overrides", () => {
    const fl = resolveFeatureFlags();
    expect(fl.agency_enabled).toBe(false);
    expect(fl.pdf_v2_enabled).toBe(true);
  });

  test("resolveFeatureFlags merge seguro com overrides", () => {
    const fl = resolveFeatureFlags({ agency_enabled: true });
    expect(fl.agency_enabled).toBe(true);
    expect(fl.inacao_enabled).toBe(false);
  });

  test("chaves desconhecidas em overrides são ignoradas", () => {
    const fl = resolveFeatureFlags({ unknown_key: true });
    expect(fl.unknown_key).toBeUndefined();
  });

  test("override boolean: apenas boolean aceito; inválido usa default", () => {
    const fl = resolveFeatureFlags({ agency_enabled: "true" });
    expect(fl.agency_enabled).toBe(false);
    const fl2 = resolveFeatureFlags({ agency_enabled: true });
    expect(fl2.agency_enabled).toBe(true);
  });
});
