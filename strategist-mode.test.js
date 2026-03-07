/**
 * Testes para Modo Estrategista (VCE, ROIx, CDO)
 */
import { computeStrategistMetrics, formatStrategistValue } from "./strategist-mode.js";

describe("strategist-mode", () => {
  describe("computeStrategistMetrics", () => {
    it("retorna inválido sem precoBase", () => {
      const r = computeStrategistMetrics({ precoBase: 0 });
      expect(r.ok).toBe(false);
      expect(r.vce).toBeNull();
      expect(r.roix).toBeNull();
      expect(r.cdo).toBeNull();
    });

    it("retorna inválido com precoBase negativo", () => {
      const r = computeStrategistMetrics({ precoBase: -100 });
      expect(r.ok).toBe(false);
    });

    it("VCE e ROIx válidos quando precoBase e ganho > 0", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, valorGanhoEstimado12m: 100000 });
      expect(r.ok).toBe(true);
      expect(r.vce).toBeCloseTo(10);
      expect(r.roix).toBeCloseTo(10);
    });

    it("VCE < 5%: captura conservadora", () => {
      const r = computeStrategistMetrics({ precoBase: 2000, valorGanhoEstimado12m: 100000 });
      expect(r.vce).toBeCloseTo(2);
      expect(r.vceLabel).toBe("captura conservadora");
    });

    it("VCE 5-20%: sem label especial", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, valorGanhoEstimado12m: 100000 });
      expect(r.vce).toBeCloseTo(10);
      expect(r.vceLabel).toBeNull();
    });

    it("VCE > 20%: captura elevada", () => {
      const r = computeStrategistMetrics({ precoBase: 30000, valorGanhoEstimado12m: 100000 });
      expect(r.vce).toBeCloseTo(30);
      expect(r.vceLabel).toBe("captura elevada");
    });

    it("ganho < preço: viabilidadeAlerta true", () => {
      const r = computeStrategistMetrics({ precoBase: 50000, valorGanhoEstimado12m: 30000 });
      expect(r.viabilidadeAlerta).toBe(true);
      expect(r.vce).toBeCloseTo(166.67, 1);
    });

    it("ganho >= preço: viabilidadeAlerta false", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, valorGanhoEstimado12m: 50000 });
      expect(r.viabilidadeAlerta).toBe(false);
    });

    it("CDO = custoOportunidadeMensal / 30", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, custoOportunidadeMensal: 900 });
      expect(r.cdo).toBeCloseTo(30);
    });

    it("CDO com custo negativo usa 0", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, custoOportunidadeMensal: -100 });
      expect(r.cdo).toBeCloseTo(0);
    });

    it("VCE/ROIx = — quando valorGanhoEstimado12m = 0", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, valorGanhoEstimado12m: 0 });
      expect(r.ok).toBe(true);
      expect(r.vce).toBeNull();
      expect(r.roix).toBeNull();
      expect(r.cdo).toBe(0);
      expect(r.custoInacaoSemanal).toBeNull();
      expect(r.custoInacaoMensal).toBeNull();
      expect(r.vcePct).toBeNull();
    });

    it("custoInacaoSemanal e custoInacaoMensal quando valorGanhoEstimado12m > 0", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, valorGanhoEstimado12m: 52000 });
      expect(r.custoInacaoSemanal).toBeCloseTo(1000, 2);
      expect(r.custoInacaoMensal).toBeCloseTo(4333.33, 2);
      expect(r.vcePct).toBeCloseTo(19.23, 1);
    });

    it("bordas retornam null (ganho ausente/zero/NaN)", () => {
      const r1 = computeStrategistMetrics({ precoBase: 10000 });
      expect(r1.custoInacaoSemanal).toBeNull();
      expect(r1.custoInacaoMensal).toBeNull();
      const r2 = computeStrategistMetrics({ precoBase: 10000, valorGanhoEstimado12m: NaN });
      expect(r2.custoInacaoSemanal).toBeNull();
    });

    it("edge case: divisão por zero não ocorre", () => {
      const r = computeStrategistMetrics({ precoBase: 10000, valorGanhoEstimado12m: 0 });
      expect(r.vce).toBeNull();
      expect(r.roix).toBeNull();
    });

    it("edge case: valores inválidos não crasham", () => {
      const r = computeStrategistMetrics({ precoBase: NaN, valorGanhoEstimado12m: "x" });
      expect(r.ok).toBe(false);
    });
  });

  describe("formatStrategistValue", () => {
    it("retorna — para null/undefined", () => {
      expect(formatStrategistValue(null)).toBe("—");
      expect(formatStrategistValue(undefined)).toBe("—");
    });

    it("retorna — para NaN", () => {
      expect(formatStrategistValue(NaN)).toBe("—");
    });

    it("formata percent", () => {
      expect(formatStrategistValue(10.5, "percent")).toBe("10.5%");
    });

    it("formata money", () => {
      expect(formatStrategistValue(1000.5, "money")).toMatch(/1\.?000/);
    });
  });
});
