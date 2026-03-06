/**
 * Paginação e regras anti-corte: keepTogether, keepWithNext, footerReserved.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md § 5
 */

/**
 * @param {Object} params
 * @param {Object} params.doc - Instância jsPDF
 * @param {number} params.margin
 * @param {number} params.pageHeight
 * @param {number} params.footerReserved
 * @param {Object} [params.deps] - { ensurePdfYSpace(y, needed, pageHeight, margin, footerReserve) => { y, addPage } }
 * @returns {Object} Layout engine API
 */
export function createPdfLayoutEngine({ doc, margin, pageHeight, footerReserved, deps = {} }) {
  const ensurePdfYSpace =
    deps.ensurePdfYSpace ||
    ((y, needed, pH, m, reserve) => ({
      y: Number.isFinite(y) ? y : margin,
      addPage: false,
    }));

  let _y = margin;

  function ensureSpace(needed, opts = {}) {
    const keepTogether = opts.keepTogether !== false;
    const keepWithNext = opts.keepWithNext || false;
    // keepWithNext: reservar espaço para o próximo bloco (evitar título órfão)
    const reserveNext = keepWithNext ? 40 : 0;
    const effectiveNeeded = needed + reserveNext;
    const guard = ensurePdfYSpace(_y, effectiveNeeded, pageHeight, margin, footerReserved);
    if (guard.addPage) {
      doc.addPage();
      _y = guard.y;
    }
    return _y;
  }

  function advanceY(step = 0) {
    _y += step;
    return _y;
  }

  function setY(val) {
    _y = val;
    return _y;
  }

  function getY() {
    return _y;
  }

  function getRemainingSpace() {
    return pageHeight - margin - footerReserved - _y;
  }

  function blockFits(minHeight) {
    return getRemainingSpace() >= minHeight;
  }

  return {
    ensureSpace,
    advanceY,
    setY,
    getY,
    getRemainingSpace,
    blockFits,
    margin,
    pageHeight,
    footerReserved,
  };
}
