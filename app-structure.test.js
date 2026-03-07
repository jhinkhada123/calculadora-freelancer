/**
 * Testes de regressão Fase 2.1: garante que as 5 funções existem em app.js
 * e que os módulos necessários exportam corretamente (sem erro de import/boot).
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { buildProposalMetrics } from "./proposal-metrics.js";
import { computeTierPricing } from "./proposal-tiers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "app.js");

describe("Fase 2.1 - app.js structural", () => {
  test("app.js contém as 5 funções obrigatórias", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toMatch(/\bfunction getStateFromInputs\b/);
    expect(content).toMatch(/\bfunction setInputsFromState\b/);
    expect(content).toMatch(/\bfunction buildPricingContext\b/);
    expect(content).toMatch(/\bfunction buildNegotiationContext\b/);
    expect(content).toMatch(/\bfunction updateUI\b/);
  });

  test("app.js importa buildProposalMetrics e computeTierPricing", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toMatch(/buildProposalMetrics/);
    expect(content).toMatch(/computeTierPricing/);
  });

  test("normalizeCopyToastMessage não contém código morto de UI (retorna antes de qualquer lógica de cálculo)", () => {
    const content = readFileSync(appPath, "utf-8");
    const match = content.match(/function normalizeCopyToastMessage\([^)]*\)\s*\{([^}]+)\}/s);
    expect(match).toBeTruthy();
    const body = match[1];
    expect(body).not.toMatch(/els\.wizardContainer.*\n.*els\.advancedConfigCard/s);
    expect(body).toMatch(/return.*okMsg/);
  });
});

describe("Fase 2.1 - proposalMetrics wiring", () => {
  test("buildProposalMetrics e computeTierPricing são importáveis e executáveis", () => {
    const m = buildProposalMetrics(
      { currency: "BRL", projectHours: 30 },
      { essential: { ok: true, projectNet: 5000, hourly: 100, revenueTarget: 10000 } },
      {}
    );
    expect(m).toHaveProperty("clientSafe");
    expect(m).toHaveProperty("internalOnly");
    expect(m.clientSafe.projectNet).toBe(5000);

    const tiers = computeTierPricing(5000);
    expect(tiers).toHaveProperty("enxuto");
    expect(tiers).toHaveProperty("essencial");
    expect(tiers).toHaveProperty("premium");
  });
});
