/**
 * Testes do pdf-proposal-builder.
 * Garante que buildExecutiveCompletePdf executa sem erro com mocks válidos.
 */

import { buildExecutiveCompletePdf } from "./pdf-proposal-builder.js";
import { buildPdfContext } from "./pdf-context.js";
import { getPdfDesignSystem } from "./pdf-design-system.js";

function mockDoc() {
  const textCalls = [];
  return {
    addPage: () => {},
    setPage: () => {},
    setFont: () => {},
    setFontSize: () => {},
    text: (...args) => { textCalls.push(args); },
    get textCalls() { return textCalls; },
    getNumberOfPages: () => 1,
    splitTextToSize: (text) => String(text || "").split(/\s+/).filter(Boolean).length > 0
      ? [String(text || "").slice(0, 80)]
      : [],
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
  };
}

function mockContext() {
  return buildPdfContext({
    state: {
      currency: "BRL",
      professionalName: "João",
      clientName: "Cliente X",
      validityDate: "2026-04-01",
      projectHours: 40,
      hoursPerDay: 8,
      utilization: 80,
    },
    pricingCtx: { ok: true, projectNet: 15000 },
    negotiationCtx: {},
    strategistCtx: null,
    proposalText: "Recomendamos a aprovação desta proposta.",
    antiDiscountPhrases: ["Valor alinhado ao escopo e entrega."],
    justificationText: "",
  });
}

describe("pdf-proposal-builder", () => {
  test("buildExecutiveCompletePdf executa sem erro com mocks válidos", () => {
    const doc = mockDoc();
    const context = mockContext();
    const design = getPdfDesignSystem({ format: "complete", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
      legalDisclaimer: "Estimativas não constituem garantia.",
    };
    expect(() => {
      buildExecutiveCompletePdf({
        doc,
        context,
        design,
        layout: null,
        assets: { logoDataUrl: null, brandName: "Test" },
        deps,
      });
    }).not.toThrow();
  });

  test("buildExecutiveCompletePdf chama doc.text para rodapé", () => {
    const doc = mockDoc();
    const context = mockContext();
    const design = getPdfDesignSystem({ format: "complete", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
      legalDisclaimer: "Estimativas não constituem garantia.",
    };
    buildExecutiveCompletePdf({
      doc,
      context,
      design,
      layout: null,
      assets: { logoDataUrl: null, brandName: "Test" },
      deps,
    });
    expect(doc.textCalls.length).toBeGreaterThan(0);
    const footerCall = doc.textCalls.find(
      (c) => c[0] && String(c[0]).includes("Proposta estruturada")
    );
    expect(footerCall).toBeDefined();
  });
});
