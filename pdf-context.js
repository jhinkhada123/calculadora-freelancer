/**
 * Monta o PdfContext unificado a partir de state, pricing, negotiation e textos.
 * Sem dependências de cálculo — recebe dados já computados.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md
 */

const ANCORAGEM_FALLBACK =
  "Impacto no negócio orientado por previsibilidade, velocidade de entrega e redução de risco operacional.";

/**
 * @param {Object} params
 * @param {Object} params.state - Estado da UI (getStateFromInputs)
 * @param {Object} params.pricingCtx - Resultado effective de buildPricingContext
 * @param {Object} params.negotiationCtx - Resultado de buildNegotiationContext
 * @param {Object|null} params.strategistCtx - Resultado de computeStrategistMetrics ou null
 * @param {string} params.proposalText - Texto da proposta (getProposalTextForPdf)
 * @param {string[]} params.antiDiscountPhrases - Frases anti-desconto (getAntiDiscountPhrases)
 * @param {string} [params.justificationText] - Texto de justificativa (opcional)
 * @returns {Object} PdfContext
 */
export function buildPdfContext({
  state,
  pricingCtx,
  negotiationCtx,
  strategistCtx,
  proposalText,
  antiDiscountPhrases,
  justificationText = "",
}) {
  const validityText =
    state.validityDate && String(state.validityDate).trim()
      ? `Proposta válida até ${String(state.validityDate).trim()}.`
      : "Proposta válida por 7 dias.";

  const projectOk =
    pricingCtx?.ok &&
    pricingCtx?.projectNet != null &&
    state?.projectHours > 0;

  return {
    state,
    effective: pricingCtx,
    negotiation: negotiationCtx,
    strategist: strategistCtx,
    proposalText: proposalText || "",
    antiDiscountPhrases: Array.isArray(antiDiscountPhrases) ? antiDiscountPhrases : [],
    validityText,
    justificationText: justificationText || "",
    ancoragemFallback: ANCORAGEM_FALLBACK,
    projectOk: !!projectOk,
  };
}
