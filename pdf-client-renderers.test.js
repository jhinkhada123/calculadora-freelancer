import {
  renderClientLeanBadgeBlock,
  renderClientTiersBlock,
  renderClientUrgencyBlock,
  renderClientPdfSignals,
} from "./pdf-client-renderers.js";

function createMockDoc() {
  const calls = {
    text: [],
    roundedRect: [],
    rect: [],
  };
  return {
    calls,
    setFont: () => {},
    setFontSize: () => {},
    text: (...args) => { calls.text.push(args); },
    roundedRect: (...args) => { calls.roundedRect.push(args); },
    rect: (...args) => { calls.rect.push(args); },
    splitTextToSize: (text) => {
      const value = String(text || "").trim();
      if (!value) return [];
      const words = value.split(/\s+/);
      const lines = [];
      let acc = [];
      for (const w of words) {
        acc.push(w);
        if (acc.length >= 8) {
          lines.push(acc.join(" "));
          acc = [];
        }
      }
      if (acc.length) lines.push(acc.join(" "));
      return lines;
    },
  };
}

function createLayout(pageWidth = 595) {
  let y = 80;
  const ensureCalls = [];
  return {
    margin: 56,
    pageWidth,
    ensureCalls,
    ensureSpace: (needed) => ensureCalls.push(Number(needed) || 0),
    advanceY: (step) => { y += Number(step) || 0; },
    getY: () => y,
  };
}

describe("pdf-client-renderers", () => {
  test("renderClientPdfSignals avanca Y e usa ensureSpace com sinais validos", () => {
    const doc = createMockDoc();
    const layout = createLayout();
    const startY = layout.getY();

    renderClientPdfSignals({
      doc,
      layout,
      signals: {
        leanBadge: {
          title: "Eficiencia Lean",
          headline: "Economia estimada de 18.6%.",
          details: "Comparativo agencia vs proposta.",
        },
        urgency: {
          title: "Custo de Inacao",
          details: "Cada semana sem iniciar custa dinheiro.",
        },
        tiers: {
          title: "Arquitetura de Escolhas",
          intro: "Tres opcoes para decisao.",
          cards: [
            { name: "Enxuto", price: "R$ 8.500,00", details: "Escopo fechado." },
            { name: "Essencial", price: "R$ 10.000,00", details: "Plano recomendado." },
            { name: "Premium", price: "R$ 14.000,00", details: "Alta prioridade." },
          ],
        },
      },
    });

    expect(layout.ensureCalls.length).toBeGreaterThan(0);
    expect(layout.getY()).toBeGreaterThan(startY);
    expect(doc.calls.text.length).toBeGreaterThan(0);
  });

  test("renderClientTiersBlock usa fallback vertical em largura estreita", () => {
    const doc = createMockDoc();
    const layout = createLayout(470);

    renderClientTiersBlock({
      doc,
      layout,
      signal: {
        title: "Arquitetura de Escolhas",
        intro: "Tres opcoes.",
        cards: [
          { name: "Enxuto", price: "R$ 8.500,00", details: "Escopo fechado." },
          { name: "Essencial", price: "R$ 10.000,00", details: "Plano recomendado." },
          { name: "Premium", price: "R$ 14.000,00", details: "Alta prioridade." },
        ],
      },
    });

    expect(doc.calls.roundedRect.length + doc.calls.rect.length).toBeGreaterThanOrEqual(3);
  });

  test("blocos individuais ignoram sinais nulos", () => {
    const doc = createMockDoc();
    const layout = createLayout();
    const startY = layout.getY();

    renderClientLeanBadgeBlock({ doc, layout, signal: null });
    renderClientUrgencyBlock({ doc, layout, signal: null });
    renderClientTiersBlock({ doc, layout, signal: null });

    expect(layout.getY()).toBe(startY);
    expect(doc.calls.text.length).toBe(0);
  });
});
