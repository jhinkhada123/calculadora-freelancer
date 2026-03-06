/**
 * Ponto de entrada do novo PDF executivo.
 * Contrato estável para ser chamado do index.html.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md
 */

import { buildPdfContext } from "./pdf-context.js";
import { getPdfDesignSystem } from "./pdf-design-system.js";
import { loadPdfFonts } from "./pdf-font-loader.js";
import { buildExecutiveCompletePdf } from "./pdf-proposal-builder.js";
import { buildExecutiveCompactPdf } from "./pdf-compact-builder.js";

/**
 * Gera o PDF executivo (formato complete).
 *
 * @param {Object} params
 * @param {Object} params.state - Estado da UI (getStateFromInputs)
 * @param {Object} params.jsPdf - Módulo { jsPDF }
 * @param {string|null} params.logoDataUrl - Base64 da logo ou null
 * @param {string} [params.format] - "complete" | "compact"
 * @param {Object} [params.flags] - { pdf_impact_block_enabled, strategist_mode_enabled }
 * @param {Object} params.deps - Dependências injetadas
 * @param {Function} params.deps.buildPricingContext
 * @param {Function} params.deps.buildNegotiationContext
 * @param {Function} params.deps.getProposalTextForPdf
 * @param {Function} params.deps.getAntiDiscountPhrases
 * @param {Function} [params.deps.buildJustificationClipboardText]
 * @param {Function} [params.deps.computeStrategistMetrics]
 * @param {Function} [params.deps.ensurePdfYSpace]
 * @param {Function} params.deps.fmtMoney
 * @param {Function} params.deps.fmtNumber
 * @param {Function} [params.deps.formatStrategistValue]
 * @param {string} [params.deps.STRATEGIST_CAVEAT]
 * @param {string} params.deps.LEGAL_DISCLAIMER
 * @param {string} params.deps.BRAND_NAME
 * @param {Function} [params.deps.trackEvent]
 * @returns {Promise<{ fontMode, fallbackUsed }>} Resolve quando PDF foi salvo
 */
export async function generatePdfExecutive({
  state,
  jsPdf,
  logoDataUrl,
  format = "complete",
  flags = {},
  deps,
}) {
  const { jsPDF } = jsPdf;
  const r = deps.buildPricingContext(state).effective;
  const negotiationCtx = deps.buildNegotiationContext(state, r);
  const proposalText = deps.getProposalTextForPdf?.() ?? "";
  const antiDiscountPhrases = deps.getAntiDiscountPhrases?.(state, negotiationCtx) ?? [];

  const strategistEnabled =
    !!flags.strategist_mode_enabled &&
    !!flags.pdf_impact_block_enabled &&
    !!state?.modoEstrategista &&
    deps.computeStrategistMetrics;
  const strategistCtx =
    strategistEnabled &&
    state.projectHours > 0 &&
    r?.ok &&
    r?.projectNet != null
      ? deps.computeStrategistMetrics({
          precoBase: r.projectNet,
          valorGanhoEstimado12m: state.valorGanhoEstimado12m,
          custoOportunidadeMensal: state.custoOportunidadeMensal,
        })
      : null;

  const justificationText = deps.buildJustificationClipboardText?.(state, negotiationCtx) ?? "";

  const context = buildPdfContext({
    state,
    pricingCtx: r,
    negotiationCtx,
    strategistCtx,
    proposalText,
    antiDiscountPhrases,
    justificationText,
  });

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const assets = {
    logoDataUrl: logoDataUrl || null,
    brandName: deps.BRAND_NAME || "Calculadora de Precificação para Freelancers",
    playfairFontUrl: deps.playfairFontUrl ?? null,
  };

  const fontResult = await loadPdfFonts({
    doc,
    assets,
    strategy: "premium",
  });

  if (fontResult.fallbackUsed && typeof deps.trackEvent === "function") {
    deps.trackEvent("pdf_font_fallback_used", { reason: "playfair_unavailable" });
  }

  const design = getPdfDesignSystem({
    format: format === "compact" ? "compact" : "complete",
    theme: "ink",
    fonts: fontResult,
    pageWidth,
    pageHeight,
  });

  const fmtMoneyPdf = (amount, curr) => {
    const safe = Number.isFinite(amount) ? amount : 0;
    return deps.fmtMoney(Number(safe.toFixed(2)), curr);
  };

  const buildDeps = {
    ensurePdfYSpace: deps.ensurePdfYSpace,
    fmtMoney: fmtMoneyPdf,
    fmtNumber: deps.fmtNumber,
    formatStrategistValue: deps.formatStrategistValue,
    STRATEGIST_CAVEAT: deps.STRATEGIST_CAVEAT,
    legalDisclaimer: deps.LEGAL_DISCLAIMER,
  };

  if (format === "compact") {
    buildExecutiveCompactPdf({ doc, context, design, layout: null, assets, deps: buildDeps });
  } else {
    buildExecutiveCompletePdf({
      doc,
      context,
      design,
      layout: null,
      assets,
      deps: buildDeps,
    });
  }

  doc.save("proposta-freelancer.pdf");

  return { fontMode: fontResult.fontMode, fallbackUsed: fontResult.fallbackUsed };
}
