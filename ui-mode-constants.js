/**
 * UI mode constants.
 * Single source of truth for tabs and mode labels.
 */
export const UI_MODE_VALUES = ["essencial", "estrategista", "comparacao", "governanca"];

export const TAB_MODE_LABELS = ["Essencial", "Estrategista", "Comparacao", "Governanca"];

export const TAB_CONTEXT_HINTS = {
  essencial: "Entradas base: renda, custos, impostos, margem e horas do projeto.",
  estrategista: "VCE, ROIx e CDO para justificar preco com base no valor entregue.",
  comparacao: "Cenarios A e B para comparar variacoes e deltas lado a lado.",
  governanca: "Risco, checklist, exportacao e trilha de auditoria interna.",
};

export const TAB_PANELS = ["panel-essential", "panel-strategist", "panel-scenario", "panel-governance"];

export const TAB_IDS = ["tab-essential", "tab-strategist", "tab-scenario", "tab-governance"];

export function getUiModeDefault() {
  return "essencial";
}

export function normalizeUiMode(value) {
  if (!value || typeof value !== "string") return getUiModeDefault();
  const normalized = value.toLowerCase().trim();
  return UI_MODE_VALUES.includes(normalized) ? normalized : getUiModeDefault();
}
