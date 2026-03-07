import { sanitizeState } from "./sanitize-state.js";

const defaults = () => ({
  currency: "BRL",
  targetIncome: 9000,
  monthlyCosts: 1200,
  taxRate: 12,
  utilization: 60,
  professionalName: "",
  clientName: "",
  validityDate: "",
  areaImpacto: "",
  projectHours: 30,
  scopeRisk: 15,
  scopeVolatility: "medium",
  complexidadeProjeto: "media",
  prazoEntrega: "normal",
  impactoNoNegocio: "medio",
  proposalMode: false,
  pdfInternalFormat: "complete",
});

describe("sanitizeState", () => {
  test("retorna cópia de defaults quando raw vazio", () => {
    const d = defaults();
    const out = sanitizeState(d, {});
    expect(out).toEqual(d);
    expect(out).not.toBe(d);
  });

  test("descarta chaves não presentes em defaults", () => {
    const d = defaults();
    const out = sanitizeState(d, { foo: "bar", targetIncome: 5000 });
    expect(out).not.toHaveProperty("foo");
    expect(out.targetIncome).toBe(5000);
  });

  test("rejeita NaN e Infinity em números", () => {
    const d = defaults();
    expect(sanitizeState(d, { targetIncome: NaN }).targetIncome).toBe(0);
    expect(sanitizeState(d, { targetIncome: Infinity }).targetIncome).toBe(1e12);
    expect(sanitizeState(d, { targetIncome: -Infinity }).targetIncome).toBe(0);
  });

  test("aplica clamp em números", () => {
    const d = defaults();
    expect(sanitizeState(d, { targetIncome: -100 }).targetIncome).toBe(0);
    expect(sanitizeState(d, { targetIncome: 5000 }).targetIncome).toBe(5000);
    expect(sanitizeState(d, { utilization: 150 }).utilization).toBe(100);
  });

  test("trunca strings longas", () => {
    const d = defaults();
    const long = "A".repeat(500);
    expect(sanitizeState(d, { professionalName: long }).professionalName.length).toBe(140);
    expect(sanitizeState(d, { areaImpacto: long }).areaImpacto.length).toBe(140);
    expect(sanitizeState(d, { validityDate: "2026-12-31" }).validityDate).toBe("2026-12-31");
  });

  test("normaliza enums para whitelist, rejeita inválidos com default", () => {
    const d = defaults();
    expect(sanitizeState(d, { scopeVolatility: "low" }).scopeVolatility).toBe("low");
    expect(sanitizeState(d, { scopeVolatility: "xss" }).scopeVolatility).toBe("medium");
    expect(sanitizeState(d, { impactoNoNegocio: "critico" }).impactoNoNegocio).toBe("critico");
    expect(sanitizeState(d, { impactoNoNegocio: "invalid" }).impactoNoNegocio).toBe("medio");
  });

  test("validityDate aceita YYYY-MM-DD e converte DD/MM/YYYY", () => {
    const d = defaults();
    expect(sanitizeState(d, { validityDate: "2026-12-31" }).validityDate).toBe("2026-12-31");
    expect(sanitizeState(d, { validityDate: "31/12/2026" }).validityDate).toBe("2026-12-31");
    expect(sanitizeState(d, { validityDate: "1/5/2027" }).validityDate).toBe("2027-05-01");
    expect(sanitizeState(d, { validityDate: "invalid" }).validityDate).toBe("");
  });

  test("converte booleanos corretamente", () => {
    const d = defaults();
    expect(sanitizeState(d, { proposalMode: true }).proposalMode).toBe(true);
    expect(sanitizeState(d, { proposalMode: "true" }).proposalMode).toBe(true);
    expect(sanitizeState(d, { proposalMode: false }).proposalMode).toBe(false);
  });

  test("retorna defaults quando raw não é objeto", () => {
    const d = defaults();
    expect(sanitizeState(d, null)).toEqual(d);
    expect(sanitizeState(d, undefined)).toEqual(d);
    expect(sanitizeState(d, [])).toEqual(d);
    expect(sanitizeState(d, "string")).toEqual(d);
  });

  test("não altera valores financeiros válidos", () => {
    const d = defaults();
    const raw = { targetIncome: 12000, monthlyCosts: 1500, projectHours: 40, taxRate: 12 };
    const out = sanitizeState(d, raw);
    expect(out.targetIncome).toBe(12000);
    expect(out.monthlyCosts).toBe(1500);
    expect(out.projectHours).toBe(40);
    expect(out.taxRate).toBe(12);
  });
});
