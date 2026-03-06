/**
 * Orquestra a ordem executiva do formato complete.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md § 3.1
 */

import { createPdfLayoutEngine } from "./pdf-layout-engine.js";
import {
  renderExecutiveHeader,
  renderValueAnchor,
  renderScopeAndTimeline,
  renderPricingLogicSummary,
  renderRecommendation,
  renderInvestment,
  renderViralFooter,
} from "./pdf-block-renderers.js";

/**
 * @param {Object} params
 * @param {Object} params.doc - jsPDF
 * @param {Object} params.context - PdfContext
 * @param {Object} params.design - PdfDesignTokens
 * @param {Object} params.layout - Opcional; se não fornecido, cria um
 * @param {Object} params.assets - { logoDataUrl, brandName }
 * @param {Object} params.deps - { ensurePdfYSpace, fmtMoney, fmtNumber, formatStrategistValue, STRATEGIST_CAVEAT, legalDisclaimer }
 */
export function buildExecutiveCompletePdf({ doc, context, design, layout, assets, deps }) {
  const { margin, pageWidth, pageHeight, footerReserved, lineHeight } = design;

  const engine =
    layout ||
    createPdfLayoutEngine({
      doc,
      margin,
      pageHeight,
      footerReserved,
      deps: { ensurePdfYSpace: deps?.ensurePdfYSpace },
    });

  const writeWrapped = (text, opts = {}) => {
    const maxW = opts.maxWidth || pageWidth - 2 * margin;
    const lh = opts.lineHeight || lineHeight;
    const lines = doc.splitTextToSize(String(text || ""), maxW);
    const needed = Math.max(
      56,
      lines.length * lh + (opts.spacingAfter || 0) + 8
    );
    engine.ensureSpace(needed);
    doc.text(lines, margin, engine.getY());
    engine.advanceY(lines.length * lh + (opts.spacingAfter || 0));
  };

  const renderDeps = {
    writeWrapped,
    fmtMoney: deps?.fmtMoney || ((n, c) => String(n)),
    fmtNumber: deps?.fmtNumber || ((n) => String(n)),
    formatStrategistValue: deps?.formatStrategistValue,
    STRATEGIST_CAVEAT: deps?.STRATEGIST_CAVEAT,
  };

  // Ordem narrativa executiva
  renderExecutiveHeader(doc, context, design, engine, assets, renderDeps);
  renderValueAnchor(doc, context, design, engine, assets, renderDeps);
  renderScopeAndTimeline(doc, context, design, engine, assets, renderDeps);
  renderPricingLogicSummary(doc, context, design, engine, assets, renderDeps);
  renderRecommendation(doc, context, design, engine, assets, renderDeps);
  renderInvestment(doc, context, design, engine, assets, renderDeps);
  renderViralFooter(doc, context, design, engine, assets, renderDeps);

  // Legal disclaimer e aprovação
  doc.setFontSize(8);
  if (deps?.legalDisclaimer) {
    writeWrapped(deps.legalDisclaimer, { lineHeight: 10, spacingAfter: 6 });
  }
  doc.setFontSize(9);
  const approvalLine = `${context.validityText} Para aprovar, responda esta proposta com 'APROVADO'.`;
  writeWrapped(approvalLine, { lineHeight: 10, spacingAfter: 0 });

  // Rodapé de confiança em todas as páginas
  const footerText = `Proposta estruturada e validada por ${assets?.brandName || "Calculadora"}`;
  const footerY = pageHeight - margin - 40;
  const totalPages = typeof doc.getNumberOfPages === "function" ? doc.getNumberOfPages() : 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.text(footerText, margin, footerY);
  }
}
