/**
 * Motor de tiers (Enxuto, Essencial, Premium).
 * Apenas cálculo; sem render de PDF nesta fase.
 *
 * Este motor retorna valores brutos; buildProposalMetrics normaliza arredondamento dos outputs exibíveis.
 */

const TIER_DISCOUNT_PCT_DEFAULT = 15;
const TIER_PREMIUM_PCT_DEFAULT = 40;

/**
 * @param {number} basePrice - Preço base (Essencial)
 * @param {Object} [config] - { tierDiscountPct, tierPremiumPct }
 * @returns {{ enxuto: number, essencial: number, premium: number, metadata: Object }}
 */
export function computeTierPricing(basePrice, config = {}) {
  const tierDiscountPct = Math.max(0, Math.min(50, Number(config.tierDiscountPct) || TIER_DISCOUNT_PCT_DEFAULT));
  const tierPremiumPct = Math.max(0, Math.min(100, Number(config.tierPremiumPct) || TIER_PREMIUM_PCT_DEFAULT));

  const base = Number(basePrice);
  if (!Number.isFinite(base) || base < 0) {
    return { enxuto: null, essencial: null, premium: null, metadata: { escopo: "N/A", sla: "N/A", risco: "N/A" } };
  }

  const enxuto = base * (1 - tierDiscountPct / 100);
  const essencial = base;
  const premium = base * (1 + tierPremiumPct / 100);

  return {
    enxuto,
    essencial,
    premium,
    metadata: {
      escopo: "Tom executivo: escopo ajustado por tier",
      sla: "SLA proporcional ao investimento",
      risco: "Risco mitigado por governança de escopo",
    },
  };
}

export const TIER_DEFAULTS = {
  tierDiscountPct: TIER_DISCOUNT_PCT_DEFAULT,
  tierPremiumPct: TIER_PREMIUM_PCT_DEFAULT,
};
