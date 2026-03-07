/**
 * Fonte única de verdade para feature flags.
 * Não usa window.* como fonte de verdade.
 * resolveFeatureFlags(overrides?) faz merge seguro e previsível.
 */

/** @type {Readonly<Record<string, boolean|string>>} */
export const FEATURE_FLAGS_DEFAULTS = Object.freeze({
  agency_enabled: false,
  inacao_enabled: false,
  batna_enabled: false,
  tiers_enabled: false,
  risk_score_enabled: true,
  pdf_v2_enabled: true,
  pdf_executive_proposal_enabled: false,
  strategist_mode_enabled: false,
  pdf_impact_block_enabled: false,
  premium_soft_lock_enabled: true,
  pdf_internal_compact_enabled: false,
  ui_split_enabled: false,
  ui_wizard_enabled: false,
  ui_preview_anchor_enabled: false,
  ui_trust_badges_enabled: false,
  ui_micro_interactions_enabled: true,
  ui_counter_up_enabled: true,
  ui_panel_fade_enabled: true,
  ui_skeleton_tabs_enabled: true,
  ui_risk_thermometer_enabled: true,
  ui_glassmorphism_boost_enabled: true,
  ui_mobile_a11y_enabled: false,
  pdf_playfair_font_url: "",
  pdf_playfair_font_base64: "",
});

/**
 * Merge seguro: aceita apenas chaves conhecidas em DEFAULTS.
 * Monta objeto novo iterando FEATURE_FLAGS_DEFAULTS.
 * Boolean: override deve ser boolean; valor inválido ignora com fallback para default.
 * String: override string; valor inválido fallback para default.
 *
 * @param {Object} [overrides] - Sobrescritas opcionais (apenas chaves conhecidas)
 * @returns {Record<string, boolean|string>}
 */
export function resolveFeatureFlags(overrides = {}) {
  const out = {};
  const def = FEATURE_FLAGS_DEFAULTS;
  const ov = overrides && typeof overrides === "object" ? overrides : {};
  for (const k of Object.keys(def)) {
    if (!Object.prototype.hasOwnProperty.call(def, k)) continue;
    const defVal = def[k];
    const ovVal = ov[k];
    if (typeof defVal === "boolean") {
      out[k] = typeof ovVal === "boolean" ? ovVal : defVal;
    } else {
      out[k] = typeof ovVal === "string" ? ovVal : (defVal ?? "");
    }
  }
  return out;
}
