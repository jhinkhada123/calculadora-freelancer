/**
 * Tokens de tema, tipografia e espaçamento para o PDF executivo.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md § 4
 */

const DEFAULT_MARGIN = 56;
const DEFAULT_FOOTER_RESERVED = 60;
const DEFAULT_BLOCK_GAP = 24;
const DEFAULT_LINE_HEIGHT = 12;
const DEFAULT_TITLE_SPACING = 18;

const COLORS = {
  ink: "#070A12",
  inkSecondary: "#111A33",
  emerald: "#059669",
  emeraldLight: "#10B981",
  slate: "#94A3B8",
};

/**
 * @param {Object} params
 * @param {string} [params.format] - "complete" | "compact"
 * @param {string} [params.theme] - "ink" (default)
 * @param {string} [params.fontFallbackMode] - "helvetica" quando Playfair falha
 * @param {number} [params.pageWidth]
 * @param {number} [params.pageHeight]
 * @returns {Object} PdfDesignTokens
 */
export function getPdfDesignSystem({
  format = "complete",
  theme = "ink",
  fontFallbackMode = "helvetica",
  pageWidth = 595,
  pageHeight = 842,
} = {}) {
  const margin = DEFAULT_MARGIN;
  const footerReserved = DEFAULT_FOOTER_RESERVED;
  const blockGap = format === "compact" ? 16 : DEFAULT_BLOCK_GAP;
  const lineHeight = format === "compact" ? 10 : DEFAULT_LINE_HEIGHT;
  const titleSpacing = format === "compact" ? 14 : DEFAULT_TITLE_SPACING;

  const titleFont = fontFallbackMode === "helvetica" ? "helvetica" : "helvetica";
  const titleStyle = "bold";
  const bodyFont = "helvetica";
  const bodyStyle = "normal";

  return {
    format,
    theme,
    margin,
    pageWidth,
    pageHeight,
    footerReserved,
    blockGap,
    lineHeight,
    titleSpacing,
    colors: { ...COLORS },
    fonts: {
      title: titleFont,
      body: bodyFont,
      titleStyle,
      bodyStyle,
    },
    fontFallbackMode,
  };
}
