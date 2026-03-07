import { normalizeTextForPdf, PDF_FIELD_MAX } from "./normalize-text-for-pdf.js";

describe("normalizeTextForPdf", () => {
  test("trim e normaliza espaços", () => {
    expect(normalizeTextForPdf("  foo  bar  ", 100)).toBe("foo bar");
  });

  test("remove caracteres de controle", () => {
    expect(normalizeTextForPdf("foo\x00bar\x1F", 100)).toBe("foobar");
  });

  test("trunca com ellipsis", () => {
    const long = "A".repeat(200);
    const out = normalizeTextForPdf(long, 50);
    expect(out.length).toBe(51);
    expect(out.endsWith("…")).toBe(true);
  });

  test("retorna vazio para null/undefined", () => {
    expect(normalizeTextForPdf(null, 100)).toBe("");
    expect(normalizeTextForPdf(undefined, 100)).toBe("");
  });

  test("preserva texto normal", () => {
    expect(normalizeTextForPdf("João Silva", PDF_FIELD_MAX.professionalName)).toBe("João Silva");
  });

  test("remove caracteres de controle mas preserva texto imprimível", () => {
    expect(normalizeTextForPdf("João & Maria", 100)).toBe("João & Maria");
  });
});
