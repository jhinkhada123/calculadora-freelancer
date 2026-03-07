import { buildClientPdfSignals, flattenClientPdfSignalsText } from "./pdf-client-signals.js";

describe("pdf-client-signals", () => {
  test("flags OFF retornam blocos nulos", () => {
    const signals = buildClientPdfSignals(
      {
        agencyEconomiaPercentual: 22.2,
        agencyEconomiaValor: 12000,
        agencyCost: 40000,
        proposalCost: 28000,
        custoInacaoSemanal: 2300,
        custoInacaoMensal: 10000,
        tierEnxuto: 9000,
        tierEssencial: 11000,
        tierPremium: 15000,
      },
      {
        pdf_lean_badge_enabled: false,
        pdf_urgency_enabled: false,
        pdf_tiers_enabled: false,
      },
      "BRL"
    );

    expect(signals.leanBadge).toBeNull();
    expect(signals.urgency).toBeNull();
    expect(signals.tiers).toBeNull();
  });

  test("monta lean badge quando dados validos", () => {
    const signals = buildClientPdfSignals(
      {
        agencyEconomiaPercentual: 18.6,
        agencyEconomiaValor: 9300,
        agencyCost: 31000,
        proposalCost: 21700,
      },
      { pdf_lean_badge_enabled: true },
      "BRL"
    );

    expect(signals.leanBadge).toBeTruthy();
    expect(signals.leanBadge.title).toContain("Eficiencia Lean");
    expect(signals.leanBadge.headline).toContain("18.6%");
  });

  test("monta bloco de inacao com detalhes financeiros", () => {
    const signals = buildClientPdfSignals(
      {
        custoInacaoSemanal: 2307,
        custoInacaoMensal: 10000,
        valorGanhoEstimado12m: 120000,
        vcePct: 8.4,
      },
      { pdf_urgency_enabled: true },
      "BRL"
    );

    expect(signals.urgency).toBeTruthy();
    expect(signals.urgency.title).toContain("Inacao");
    expect(signals.urgency.details).toContain("semana");
  });

  test("monta tiers em 3 opcoes quando valores validos", () => {
    const signals = buildClientPdfSignals(
      {
        tierEnxuto: 8500,
        tierEssencial: 10000,
        tierPremium: 14000,
      },
      { pdf_tiers_enabled: true },
      "BRL"
    );

    expect(signals.tiers).toBeTruthy();
    expect(signals.tiers.cards).toHaveLength(3);
    expect(signals.tiers.cards[1].name).toBe("Essencial");
  });

  test("internalOnly injetado no input nao aparece nos sinais", () => {
    const signals = buildClientPdfSignals(
      {
        agencyEconomiaPercentual: 12,
        agencyEconomiaValor: 1200,
        agencyCost: 5200,
        proposalCost: 4000,
        batnaLevel: "ALTO",
        batnaMessage: "BATNA interno",
      },
      { pdf_lean_badge_enabled: true },
      "BRL"
    );

    const flat = flattenClientPdfSignalsText(signals).toUpperCase();
    expect(flat).not.toContain("BATNA");
    expect(flat).not.toContain("ALTO");
  });
});
