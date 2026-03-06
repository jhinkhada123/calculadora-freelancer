/**
 * Carrega fontes premium para o PDF executivo.
 * Playfair para títulos; fallback para Helvetica em caso de falha.
 * Nunca lança erro fatal — sempre retorna contrato válido.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md § 6.2
 */

const FONT_NAMES = {
  title: "Playfair",
  body: "helvetica",
  mono: "courier",
};

const FALLBACK = {
  titleFont: "helvetica",
  bodyFont: "helvetica",
  monoFont: "courier",
  fallbackUsed: true,
  fontMode: "fallback",
};

const PREMIUM = {
  titleFont: FONT_NAMES.title,
  bodyFont: "helvetica",
  monoFont: "courier",
  fallbackUsed: false,
  fontMode: "premium",
};

/**
 * Tenta carregar Playfair via URL e registrar no doc.
 * @param {Object} doc - Instância jsPDF
 * @param {string} fontUrl - URL do arquivo de fonte (TTF ou formato jsPDF)
 * @returns {boolean} true se registrou com sucesso
 */
async function tryLoadPlayfairFromUrl(doc, fontUrl) {
  if (!fontUrl || typeof fontUrl !== "string") return false;
  if (typeof fetch !== "function") return false;
  try {
    const res = await fetch(fontUrl, { mode: "cors" });
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const vfsName = "playfair-normal.ttf";
    if (typeof doc.addFileToVFS === "function") {
      doc.addFileToVFS(vfsName, base64);
    }
    if (typeof doc.addFont === "function") {
      doc.addFont(vfsName, FONT_NAMES.title, "normal");
      doc.addFont(vfsName, FONT_NAMES.title, "bold");
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : "";
}

/**
 * Carrega fontes para o PDF executivo.
 *
 * @param {Object} params
 * @param {Object} params.doc - Instância jsPDF
 * @param {Object} [params.assets] - { playfairFontUrl?: string }
 * @param {string} [params.strategy] - "premium" (tentar Playfair) | "fallback" (só Helvetica)
 * @returns {Promise<{ titleFont, bodyFont, monoFont, fallbackUsed, fontMode }>}
 */
export async function loadPdfFonts({ doc, assets = {}, strategy = "premium" }) {
  if (!doc) return FALLBACK;
  if (strategy === "fallback") return FALLBACK;

  const fontUrl = assets?.playfairFontUrl;
  const loaded = await tryLoadPlayfairFromUrl(doc, fontUrl);

  if (loaded) return { ...PREMIUM };
  return { ...FALLBACK };
}
