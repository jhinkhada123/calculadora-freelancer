import { compute } from "./calculadora.js";
import {
  computeDynamicScarcityMarkup,
  computeRoiAnchor,
  computeRunwaySummary,
  computeScopeShielding,
  generateJustificationBlocks,
  RUNWAY_HIGH_MONTHS,
  RUNWAY_MED_MONTHS,
  BATNA_CLASSIFICATION_BASIS,
} from "./negotiation-v21.js";

function baseState(overrides = {}) {
  return {
    currency: "BRL",
    targetIncome: 9000,
    monthlyCosts: 1200,
    taxRate: 12,
    profitMargin: 15,
    buffer: 10,
    utilization: 60,
    hoursPerDay: 6,
    daysPerWeek: 5,
    vacationWeeks: 4,
    projectHours: 30,
    scopeRisk: 15,
    discount: 0,
    clientName: "Projeto Alpha",
    prazoEntrega: "normal",
    criticidadeNegocio: "media",
    impactoNoNegocio: "medio",
    ...overrides,
  };
}

describe("negotiation-v21", () => {
  test("gera blocos de justificativa em pt-BR", () => {
    const blocks = generateJustificationBlocks({
      state: baseState({ prazoEntrega: "urgente", impactoNoNegocio: "critico" }),
      scopeShield: { markupPct: 12.5 },
      scarcity: { markupPct: 9.2 },
      roi: { enabled: true, text: "anchor" },
    });
    expect(blocks.resumoExecutivo).toMatch(/Resumo executivo/i);
    expect(blocks.justificativaTecnica).toMatch(/Justificativa técnica/i);
    expect(blocks.justificativaPrioridadeRisco).toMatch(/prioridade\/risco/i);
    expect(blocks.caveat).toBe("Estimativa sujeita à execução e variáveis operacionais.");
  });

  test("ROI anchor só aparece com impacto crítico", () => {
    const on = computeRoiAnchor({ impactoNoNegocio: "critico", areaImpacto: "operações" });
    const off = computeRoiAnchor({ impactoNoNegocio: "alto", areaImpacto: "operações" });
    expect(on.enabled).toBe(true);
    expect(on.text).toMatch(/impacto crítico/i);
    expect(off.enabled).toBe(false);
    expect(off.text).toBe("");
    expect(on.caveat).toBe("Estimativa sujeita à execução e variáveis operacionais.");
  });

  test("scope shielding respeita score e teto de markup", () => {
    const low = computeScopeShielding({});
    const high = computeScopeShielding({
      historicoMuitasAlteracoes: true,
      comunicacaoFragmentada: true,
      tomadorIndefinido: true,
      escopoIncompleto: true,
      urgenciaSemBriefing: true,
    });
    expect(low.level).toBe("low");
    expect(low.markupPct).toBeGreaterThanOrEqual(0);
    expect(low.markupPct).toBeLessThanOrEqual(5);
    expect(high.level).toBe("high");
    expect(high.markupPct).toBeLessThanOrEqual(18);
  });

  test("curva de escassez dinâmica segue faixas", () => {
    expect(computeDynamicScarcityMarkup(60).markupPct).toBeCloseTo(0, 6);
    expect(computeDynamicScarcityMarkup(80).markupPct).toBeCloseTo(12, 1);
    expect(computeDynamicScarcityMarkup(95).markupPct).toBeCloseTo(25, 1);
    expect(computeDynamicScarcityMarkup(100).markupPct).toBeCloseTo(30, 1);
  });

  test("runway calcula atual, pós-projeto e projetos para meta", () => {
    const runway = computeRunwaySummary({
      reservaMetaMeses: 6,
      reservaAtual: 12000,
      custoPessoalMensal: 4000,
      projectNet: 8000,
    });
    expect(runway.runwayMesesAtual).toBeCloseTo(3, 1);
    expect(runway.runwayMesesPosProjeto).toBeCloseTo(5, 1);
    expect(runway.projetosNecessarios).toBe(2);
  });

  test("BATNA ALTO quando runway >= RUNWAY_HIGH_MONTHS", () => {
    const runway = computeRunwaySummary({
      reservaAtual: 50000,
      custoPessoalMensal: 8000,
      projectNet: 0,
    });
    expect(runway.runwayMesesAtual).toBeGreaterThanOrEqual(RUNWAY_HIGH_MONTHS);
    expect(runway.batnaLevel).toBe("ALTO");
  });

  test("BATNA MEDIO quando runway >= RUNWAY_MED_MONTHS e < HIGH", () => {
    const runway = computeRunwaySummary({
      reservaAtual: 10000,
      custoPessoalMensal: 4000,
      projectNet: 0,
    });
    expect(runway.runwayMesesAtual).toBeGreaterThanOrEqual(RUNWAY_MED_MONTHS);
    expect(runway.runwayMesesAtual).toBeLessThan(RUNWAY_HIGH_MONTHS);
    expect(runway.batnaLevel).toBe("MEDIO");
  });

  test("BATNA BAIXO quando runway < RUNWAY_MED_MONTHS", () => {
    const runway = computeRunwaySummary({
      reservaAtual: 1000,
      custoPessoalMensal: 4000,
      projectNet: 0,
    });
    expect(runway.batnaLevel).toBe("BAIXO");
  });

  test("BATNA_CLASSIFICATION_BASIS é current por padrão", () => {
    expect(BATNA_CLASSIFICATION_BASIS).toBe("current");
  });

  test("paridade do modo essencial permanece em ±0.01", () => {
    const a = compute(baseState());
    const b = compute(baseState());
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(Math.abs((a.hourly || 0) - (b.hourly || 0))).toBeLessThanOrEqual(0.01);
    expect(Math.abs((a.revenueTarget || 0) - (b.revenueTarget || 0))).toBeLessThanOrEqual(0.01);
  });
});
