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
 * Registra fonte no doc a partir de base64 (formato jsPDF font converter).
 * @param {Object} doc - Instância jsPDF
 * @param {string} base64 - String base64 da fonte convertida
 * @returns {boolean} true se registrou com sucesso
 */
function tryRegisterFontFromBase64(doc, base64) {
  if (!base64 || typeof base64 !== "string") return false;
  const clean = base64.replace(/^data:[^;]+;base64,/, "").trim();
  if (!clean.length) return false;
  try {
    const vfsName = "playfair-normal.ttf";
    if (typeof doc.addFileToVFS === "function") doc.addFileToVFS(vfsName, clean);
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

/**
 * Tenta carregar Playfair via URL ou base64 e registrar no doc.
 * jsPDF exige formato do font converter (não TTF bruto).
 * @param {Object} doc - Instância jsPDF
 * @param {string} fontUrl - URL que retorna base64 (text/plain) ou binário
 * @param {string} fontBase64 - Base64 direto (alternativa à URL)
 * @returns {boolean} true se registrou com sucesso
 */
async function tryLoadPlayfair(doc, fontUrl, fontBase64) {
  if (fontBase64 && tryRegisterFontFromBase64(doc, fontBase64)) return true;
  if (!fontUrl || typeof fontUrl !== "string") return false;
  if (typeof fetch !== "function") return false;
  try {
    const res = await fetch(fontUrl, { mode: "cors" });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    let base64;
    if (ct.includes("text/plain") || ct.includes("application/base64")) {
      base64 = (await res.text()).trim();
    } else {
      const buf = await res.arrayBuffer();
      base64 = arrayBufferToBase64(buf);
    }
    return tryRegisterFontFromBase64(doc, base64);
  } catch (_) {
    return false;
  }
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
  const fontBase64 = assets?.playfairFontBase64;
  const loaded = await tryLoadPlayfair(doc, fontUrl, fontBase64);

  if (loaded) return { ...PREMIUM };
  return { ...FALLBACK };
}
