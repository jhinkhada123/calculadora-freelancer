import { escapeHtml } from "./escape.js";

describe("escapeHtml", () => {
  test("escapa < e >", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  test("escapa &", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  test("escapa aspas duplas e simples", () => {
    expect(escapeHtml('"foo"')).toBe("&quot;foo&quot;");
    expect(escapeHtml("'bar'")).toBe("&#39;bar&#39;");
  });

  test("converte null/undefined para string vazia", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  test("payload XSS típico em areaImpacto", () => {
    const payload = '<img src=x onerror="alert(document.cookie)">';
    expect(escapeHtml(payload)).not.toContain("<");
    expect(escapeHtml(payload)).not.toContain(">");
    expect(escapeHtml(payload)).toContain("&lt;");
    expect(escapeHtml(payload)).toContain("&gt;");
  });

  test("texto normal permanece inalterado (exceto entidades)", () => {
    expect(escapeHtml("Operações, Vendas, Financeiro")).toBe(
      "Operações, Vendas, Financeiro"
    );
  });
});
