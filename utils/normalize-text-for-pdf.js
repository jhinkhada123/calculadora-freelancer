/**
 * Normaliza texto antes de escrever no PDF.
 * Previne: caracteres de controle, quebra de layout, strings gigantes.
 *
 * Aplicar em: professionalName, clientName, validityDate, proposta,
 * justificativas, roi.text, antiDiscountPhrases.
 */

/**
 * Remove caracteres de controle (0x00–0x1F, exceto \n \t).
 */
function removeControlChars(str) {
  return String(str ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

/**
 * Normaliza espaços múltiplos e trim.
 */
function normalizeSpaces(str) {
  return String(str ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Normaliza texto para PDF: trim, remove controle, normaliza espaços, truncamento.
 * @param {string} str - Texto bruto
 * @param {number} maxLen - Limite por campo (default 500)
 * @returns {string}
 */
export function normalizeTextForPdf(str, maxLen = 500) {
  if (str == null || typeof str !== "string") return "";
  let out = removeControlChars(str);
  out = normalizeSpaces(out);
  if (out.length > maxLen) out = out.slice(0, maxLen) + "…";
  return out;
}

/** Limites por tipo de campo. */
export const PDF_FIELD_MAX = {
  professionalName: 140,
  clientName: 140,
  validityDate: 10,
  proposta: 2000,
  justificationPhrase: 500,
};
