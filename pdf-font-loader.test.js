/**
 * Testes do pdf-font-loader.
 */

import { loadPdfFonts } from "./pdf-font-loader.js";

function mockDoc() {
  const vfs = {};
  return {
    addFileToVFS: (name, data) => { vfs[name] = data; },
    addFont: (vfsName, fontName, style) => {
      if (vfsName === "invalid") throw new Error("Invalid font");
    },
    get internal() { return {}; },
  };
}

describe("pdf-font-loader", () => {
  test("retorna contrato válido com fallback quando doc é null", async () => {
    const result = await loadPdfFonts({ doc: null });
    expect(result).toMatchObject({
      titleFont: "helvetica",
      bodyFont: "helvetica",
      monoFont: "courier",
      fallbackUsed: true,
      fontMode: "fallback",
    });
  });

  test("retorna fallback quando strategy é fallback", async () => {
    const doc = mockDoc();
    const result = await loadPdfFonts({ doc, strategy: "fallback" });
    expect(result.fallbackUsed).toBe(true);
    expect(result.fontMode).toBe("fallback");
    expect(result.titleFont).toBe("helvetica");
  });

  test("retorna fallback quando sem playfairFontUrl", async () => {
    const doc = mockDoc();
    const result = await loadPdfFonts({ doc, assets: {} });
    expect(result.fallbackUsed).toBe(true);
    expect(result.titleFont).toBe("helvetica");
  });

  test("retorna contrato válido com todas as chaves esperadas", async () => {
    const result = await loadPdfFonts({ doc: null });
    expect(result).toHaveProperty("titleFont");
    expect(result).toHaveProperty("bodyFont");
    expect(result).toHaveProperty("monoFont");
    expect(result).toHaveProperty("fallbackUsed");
    expect(result).toHaveProperty("fontMode");
  });

  test("retorna premium quando addFont não lança (mock)", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    const doc = mockDoc();
    doc.addFont = () => {};
    const result = await loadPdfFonts({
      doc,
      assets: { playfairFontUrl: "https://example.com/playfair.ttf" },
    });
    globalThis.fetch = origFetch;
    expect(result.fallbackUsed).toBe(false);
    expect(result.fontMode).toBe("premium");
    expect(result.titleFont).toBe("Playfair");
  });

  test("nunca lança erro", async () => {
    const doc = mockDoc();
    doc.addFont = () => { throw new Error("Font load failed"); };
    const result = await loadPdfFonts({
      doc,
      assets: { playfairFontUrl: "https://example.com/font.ttf" },
    });
    expect(result.fallbackUsed).toBe(true);
  });
});
