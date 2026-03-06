/**
 * Testes do pdf-layout-engine.
 * Garante paginação anti-corte (keepTogether, keepWithNext, footerReserved).
 */

import { createPdfLayoutEngine } from "./pdf-layout-engine.js";
import { ensurePdfYSpace } from "./hardening-v21.js";

describe("pdf-layout-engine", () => {
  const pageHeight = 842;
  const margin = 56;
  const footerReserved = 60;

  function mockDoc() {
    const addPage = function () {};
    return { addPage };
  }

  test("createPdfLayoutEngine retorna API com ensureSpace, advanceY, getY", () => {
    const doc = mockDoc();
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    expect(engine.ensureSpace).toBeDefined();
    expect(typeof engine.ensureSpace).toBe("function");
    expect(engine.advanceY).toBeDefined();
    expect(engine.getY).toBeDefined();
    expect(engine.getRemainingSpace).toBeDefined();
    expect(engine.blockFits).toBeDefined();
  });

  test("getY inicia em margin", () => {
    const doc = mockDoc();
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    expect(engine.getY()).toBe(margin);
  });

  test("advanceY incrementa posição", () => {
    const doc = mockDoc();
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    engine.advanceY(24);
    expect(engine.getY()).toBe(margin + 24);
    engine.advanceY(16);
    expect(engine.getY()).toBe(margin + 40);
  });

  test("ensureSpace com espaço suficiente não adiciona página", () => {
    let addPageCalled = false;
    const doc = { addPage: () => { addPageCalled = true; } };
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    engine.ensureSpace(100);
    expect(addPageCalled).toBe(false);
  });

  test("ensureSpace perto do rodapé adiciona nova página", () => {
    let addPageCalled = false;
    const doc = { addPage: () => { addPageCalled = true; } };
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    engine.setY(720);
    engine.ensureSpace(120);
    expect(addPageCalled).toBe(true);
    expect(engine.getY()).toBe(margin);
  });

  test("getRemainingSpace retorna espaço até footer", () => {
    const doc = mockDoc();
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    const expected = pageHeight - margin - footerReserved - margin;
    expect(engine.getRemainingSpace()).toBe(expected);
  });

  test("blockFits retorna true quando há espaço", () => {
    const doc = mockDoc();
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    expect(engine.blockFits(100)).toBe(true);
  });

  test("blockFits retorna false quando não há espaço", () => {
    const doc = mockDoc();
    const engine = createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace },
    });
    engine.setY(pageHeight - margin - footerReserved - 10);
    expect(engine.blockFits(50)).toBe(false);
  });
});
