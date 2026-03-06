/**
 * Testes do pdf-compact-builder.
 * Garante: 1 página obrigatória, truncamento por prioridade, cenários com/sem strategist e logo.
 */

import { buildExecutiveCompactPdf } from "./pdf-compact-builder.js";
import { buildPdfContext } from "./pdf-context.js";
import { getPdfDesignSystem } from "./pdf-design-system.js";

function mockDoc() {
  const textCalls = [];
  let pageCount = 1;
  return {
    addPage: () => { pageCount++; },
    setPage: () => {},
    setFont: () => {},
    setFontSize: () => {},
    text: (...args) => { textCalls.push(args); },
    get textCalls() { return textCalls; },
    getNumberOfPages: () => pageCount,
    splitTextToSize: (text) => {
      const s = String(text || "");
      if (s.length === 0) return [];
      const words = s.split(/\s+/).filter(Boolean);
      const lines = [];
      let line = "";
      for (const w of words) {
        if ((line + " " + w).length > 60) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = line ? line + " " + w : w;
        }
      }
      if (line) lines.push(line);
      return lines.length ? lines : [s.slice(0, 60)];
    },
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
  };
}

function mockContext(overrides = {}) {
  return buildPdfContext({
    state: {
      currency: "BRL",
      professionalName: "João",
      clientName: "Cliente X",
      validityDate: "2026-04-01",
      projectHours: 40,
      hoursPerDay: 8,
      utilization: 80,
      ...overrides.state,
    },
    pricingCtx: { ok: true, projectNet: 15000, ...overrides.pricingCtx },
    negotiationCtx: overrides.negotiationCtx || {},
    strategistCtx: overrides.strategistCtx ?? null,
    proposalText: overrides.proposalText ?? "Recomendamos a aprovação desta proposta.",
    antiDiscountPhrases: overrides.antiDiscountPhrases ?? ["Valor alinhado ao escopo."],
    justificationText: overrides.justificationText ?? "",
  });
}

describe("pdf-compact-builder", () => {
  test("conteúdo curto cabe em 1 página", () => {
    const doc = mockDoc();
    const context = mockContext({ proposalText: "Aprovação recomendada." });
    const design = getPdfDesignSystem({ format: "compact", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
    };
    expect(() => {
      buildExecutiveCompactPdf({
        doc,
        context,
        design,
        layout: null,
        assets: { logoDataUrl: null, brandName: "Test" },
        deps,
      });
    }).not.toThrow();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  test("conteúdo longo NÃO cria página 2", () => {
    const doc = mockDoc();
    const longText = Array(50).fill("Esta é uma frase longa para forçar truncamento no formato compacto.").join(" ");
    const context = mockContext({ proposalText: longText });
    const design = getPdfDesignSystem({ format: "compact", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
    };
    expect(() => {
      buildExecutiveCompactPdf({
        doc,
        context,
        design,
        layout: null,
        assets: { logoDataUrl: null, brandName: "Test" },
        deps,
      });
    }).not.toThrow();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  test("com strategist renderiza ancoragem de valor", () => {
    const doc = mockDoc();
    const context = mockContext({
      strategistCtx: { ok: true, vce: 0.15, roix: 2.5, cdo: 500 },
    });
    const design = getPdfDesignSystem({ format: "compact", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
      formatStrategistValue: (v) => `${(v * 100).toFixed(0)}%`,
    };
    buildExecutiveCompactPdf({
      doc,
      context,
      design,
      layout: null,
      assets: { logoDataUrl: null, brandName: "Test" },
      deps,
    });
    expect(doc.getNumberOfPages()).toBe(1);
    const hasValueAnchor = doc.textCalls.some((c) => c[0] && String(c[0]).includes("Valor Ganho"));
    expect(hasValueAnchor).toBe(true);
  });

  test("sem strategist usa fallback de ancoragem", () => {
    const doc = mockDoc();
    const context = mockContext({ strategistCtx: null });
    const design = getPdfDesignSystem({ format: "compact", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
    };
    buildExecutiveCompactPdf({
      doc,
      context,
      design,
      layout: null,
      assets: { logoDataUrl: null, brandName: "Test" },
      deps,
    });
    expect(doc.getNumberOfPages()).toBe(1);
    const hasFallback = doc.textCalls.some((c) => c[0] && String(c[0]).includes("Impacto no negócio"));
    expect(hasFallback).toBe(true);
  });

  test("com logo renderiza header compacto", () => {
    const doc = mockDoc();
    const context = mockContext();
    const design = getPdfDesignSystem({ format: "compact", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
    };
    const fakeLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    expect(() => {
      buildExecutiveCompactPdf({
        doc,
        context,
        design,
        layout: null,
        assets: { logoDataUrl: fakeLogo, brandName: "Test" },
        deps,
      });
    }).not.toThrow();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  test("rodapé de confiança sempre visível", () => {
    const doc = mockDoc();
    const context = mockContext();
    const design = getPdfDesignSystem({ format: "compact", pageWidth: 595, pageHeight: 842 });
    const deps = {
      fmtMoney: (n) => `R$ ${Number(n).toFixed(2)}`,
      fmtNumber: (n, d = 0) => Number(n).toFixed(d),
    };
    buildExecutiveCompactPdf({
      doc,
      context,
      design,
      layout: null,
      assets: { logoDataUrl: null, brandName: "Test" },
      deps,
    });
    const hasFooter = doc.textCalls.some((c) => c[0] && String(c[0]).includes("Proposta estruturada"));
    expect(hasFooter).toBe(true);
  });
});
