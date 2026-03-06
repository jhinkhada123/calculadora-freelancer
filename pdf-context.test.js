/**
 * Testes do pdf-context.
 */

import { buildPdfContext } from "./pdf-context.js";

describe("pdf-context", () => {
  test("buildPdfContext retorna objeto com state, effective, validityText", () => {
    const ctx = buildPdfContext({
      state: { validityDate: "2026-04-01" },
      pricingCtx: { ok: true, projectNet: 10000 },
      negotiationCtx: {},
      strategistCtx: null,
      proposalText: "Aprovação recomendada.",
      antiDiscountPhrases: ["Valor alinhado."],
    });
    expect(ctx.state).toBeDefined();
    expect(ctx.effective).toBeDefined();
    expect(ctx.validityText).toContain("2026-04-01");
    expect(ctx.ancoragemFallback).toContain("Impacto no negócio");
  });

  test("projectOk é true quando projectNet e projectHours válidos", () => {
    const ctx = buildPdfContext({
      state: { projectHours: 40 },
      pricingCtx: { ok: true, projectNet: 15000 },
      negotiationCtx: {},
      strategistCtx: null,
      proposalText: "",
      antiDiscountPhrases: [],
    });
    expect(ctx.projectOk).toBe(true);
  });

  test("projectOk é false quando projectHours zero", () => {
    const ctx = buildPdfContext({
      state: { projectHours: 0 },
      pricingCtx: { ok: true, projectNet: 15000 },
      negotiationCtx: {},
      strategistCtx: null,
      proposalText: "",
      antiDiscountPhrases: [],
    });
    expect(ctx.projectOk).toBe(false);
  });

  test("validityText fallback quando sem validityDate", () => {
    const ctx = buildPdfContext({
      state: {},
      pricingCtx: {},
      negotiationCtx: {},
      strategistCtx: null,
      proposalText: "",
      antiDiscountPhrases: [],
    });
    expect(ctx.validityText).toContain("7 dias");
  });
});
