/**
 * Builder do formato compact: 1 página obrigatória com truncamento controlado.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md § 7.2
 */

import {
  renderValueAnchor,
  renderScopeAndTimeline,
  renderRecommendation,
  renderInvestment,
  renderViralFooter,
} from "./pdf-block-renderers.js";

const PAGE_BUDGET = 842 - 56 - 60 - 56; // pageHeight - margin - footerReserved - margin

/** Prioridade: 1 = mais alto (obrigatório), 5 = mais baixo (drop primeiro) */
const BLOCK_CONFIG = {
  header: { priority: 1, minHeight: 120, truncatePolicy: "none" },
  valueAnchor: { priority: 2, minHeight: 50, truncatePolicy: "none" },
  scopeTimeline: { priority: 3, minHeight: 70, truncatePolicy: "none" },
  pricingLogic: { priority: 6, minHeight: 50, truncatePolicy: "drop" },
  recommendation: { priority: 4, minHeight: 40, truncatePolicy: "lines", maxLines: 2 },
  investment: { priority: 4, minHeight: 60, truncatePolicy: "none" },
  viralFooter: { priority: 5, minHeight: 24, truncatePolicy: "lines", maxLines: 1 },
};

/**
 * Layout engine para compacto: NUNCA adiciona página.
 * ensureSpace(opts) compatível com renderers: quando não há espaço, não adiciona página.
 */
function createCompactLayoutEngine({ doc, margin, pageHeight, footerReserved }) {
  let _y = margin;
  const maxY = pageHeight - margin - footerReserved;

  function ensureSpace(needed, opts = {}) {
    if (_y + needed > maxY) {
      return;
    }
  }

  function advanceY(step = 0) {
    _y = Math.min(_y + step, maxY);
    return _y;
  }

  function setY(val) {
    _y = val;
    return val;
  }

  function getY() {
    return _y;
  }

  function getRemainingSpace() {
    return Math.max(0, maxY - _y);
  }

  return { ensureSpace, advanceY, setY, getY, getRemainingSpace, margin, pageHeight, footerReserved };
}

/**
 * @param {Object} params - Mesmo contrato de buildExecutiveCompletePdf
 */
export function buildExecutiveCompactPdf({ doc, context, design, layout, assets, deps }) {
  const { margin, pageWidth, pageHeight, footerReserved, lineHeight } = design;

  const engine =
    layout ||
    createCompactLayoutEngine({ doc, margin, pageHeight, footerReserved });

  const maxW = pageWidth - 2 * margin;
  const compactLineHeight = 10;

  const writeWrappedCompact = (text, opts = {}) => {
    const lh = opts.lineHeight ?? compactLineHeight;
    const lines = doc.splitTextToSize(String(text || ""), opts.maxWidth ?? maxW);
    const remaining = engine.getRemainingSpace();
    const maxLinesBySpace = Math.max(0, Math.floor((remaining - (opts.spacingAfter || 0) - 4) / lh));
    const maxLines = Math.min(opts.maxLines ?? 99, maxLinesBySpace);
    const toRender = lines.slice(0, maxLines);
    const truncated = lines.length > maxLines;
    if (toRender.length === 0) return { rendered: 0, truncated: true };
    const needed = toRender.length * lh + (opts.spacingAfter || 0) + 4;
    engine.ensureSpace(needed);
    doc.text(toRender, margin, engine.getY());
    if (truncated && toRender.length > 0) {
      doc.setFontSize(8);
      doc.text("…", margin, engine.getY() + (toRender.length - 1) * lh);
      doc.setFontSize(opts.fontSize ?? 10);
    }
    engine.advanceY(toRender.length * lh + (opts.spacingAfter || 0));
    return { rendered: toRender.length, truncated };
  };

  const renderDeps = {
    writeWrapped: writeWrappedCompact,
    fmtMoney: deps?.fmtMoney || ((n, c) => String(n)),
    fmtNumber: deps?.fmtNumber || ((n) => String(n)),
    formatStrategistValue: deps?.formatStrategistValue,
    STRATEGIST_CAVEAT: null,
  };

  const tryBlock = (name, renderFn, minHeight) => {
    if (engine.getRemainingSpace() < minHeight) return false;
    try {
      renderFn();
      return true;
    } catch {
      return false;
    }
  };

  // 1. Header (obrigatório)
  tryBlock("header", () => {
    if (assets?.logoDataUrl && engine.getRemainingSpace() >= 84) {
      try {
        const fmt = assets.logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(assets.logoDataUrl, fmt, (pageWidth - 120) / 2, engine.getY(), 120, 40);
        engine.advanceY(64);
      } catch (_) {}
    }
    doc.setFont(design.fonts.body, design.fonts.bodyStyle);
    doc.setFontSize(10);
    doc.text(assets?.brandName || "Proposta", margin, engine.getY());
    engine.advanceY(12);
    const profLabel = context.state?.professionalName?.trim() || "Profissional Responsável";
    doc.text(`Responsável: ${profLabel}`, margin, engine.getY());
    engine.advanceY(12);
    if (context.state?.clientName) {
      doc.text(`Cliente: ${context.state.clientName}`, margin, engine.getY());
      engine.advanceY(12);
    }
    doc.setFont(design.fonts.title, design.fonts.titleStyle);
    doc.setFontSize(12);
    doc.text("Proposta Estratégica", margin, engine.getY());
    engine.advanceY(design.blockGap);
  }, BLOCK_CONFIG.header.minHeight);

  // 2. Ancoragem de Valor (obrigatório)
  tryBlock("valueAnchor", () => {
    renderValueAnchor(doc, context, design, engine, assets, renderDeps);
  }, BLOCK_CONFIG.valueAnchor.minHeight);

  // 3. Escopo e Prazo (obrigatório)
  tryBlock("scopeTimeline", () => {
    renderScopeAndTimeline(doc, context, design, engine, assets, renderDeps);
  }, BLOCK_CONFIG.scopeTimeline.minHeight);

  // 4. Investimento (obrigatório)
  tryBlock("investment", () => {
    renderInvestment(doc, context, design, engine, assets, renderDeps);
  }, BLOCK_CONFIG.investment.minHeight);

  // 5. Recomendação (truncar linhas se exceder)
  if (engine.getRemainingSpace() >= BLOCK_CONFIG.recommendation.minHeight && context.proposalText) {
    const origProposal = context.proposalText;
    const lines = doc.splitTextToSize(origProposal, maxW);
    if (lines.length > 2) {
      context.proposalText = lines.slice(0, 2).join(" ") + (lines.length > 2 ? "…" : "");
    }
    tryBlock("recommendation", () => {
      renderRecommendation(doc, context, design, engine, assets, renderDeps);
    }, BLOCK_CONFIG.recommendation.minHeight);
    context.proposalText = origProposal;
  }

  // 6. Rodapé viral (1 frase)
  if (engine.getRemainingSpace() >= BLOCK_CONFIG.viralFooter.minHeight) {
    tryBlock("viralFooter", () => {
      renderViralFooter(doc, context, design, engine, assets, renderDeps);
    }, BLOCK_CONFIG.viralFooter.minHeight);
  }

  // 7. Rodapé de confiança (sempre)
  const footerText = `Proposta estruturada e validada por ${assets?.brandName || "Calculadora"}`;
  const footerY = pageHeight - margin - 40;
  doc.setFontSize(8);
  doc.text(footerText, margin, footerY);

  // Garantir que nunca houve addPage
  const totalPages = typeof doc.getNumberOfPages === "function" ? doc.getNumberOfPages() : 1;
  if (totalPages > 1) {
    throw new Error("Compact PDF must never exceed 1 page");
  }
}
