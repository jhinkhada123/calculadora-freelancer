/**
 * Escapa caracteres HTML para prevenir XSS.
 * Usado em sinks como innerHTML quando conteúdo vem de fontes não confiáveis.
 * @param {unknown} value - Valor a escapar (será convertido para string)
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
