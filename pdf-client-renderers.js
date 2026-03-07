function splitSafe(doc, text, width) {
  return doc.splitTextToSize(String(text || ""), Math.max(80, Number(width) || 80));
}

function writeWrapped(doc, text, x, y, width, lineHeight = 11) {
  const lines = splitSafe(doc, text, width);
  if (lines.length) {
    doc.text(lines, x, y);
  }
  return lines.length;
}

function drawCardContainer(doc, x, y, w, h) {
  if (typeof doc.roundedRect === "function") {
    doc.roundedRect(x, y, w, h, 8, 8, "S");
    return;
  }
  if (typeof doc.rect === "function") {
    doc.rect(x, y, w, h, "S");
  }
}

function renderSectionTitle(doc, text, margin, layout) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(String(text || ""), margin, layout.getY());
  layout.advanceY(15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
}

export function renderClientLeanBadgeBlock({ doc, signal, layout }) {
  if (!signal) return;
  const margin = layout.margin;
  const width = layout.pageWidth - 2 * margin;
  const bodyLines = splitSafe(doc, `${signal.headline} ${signal.details}`.trim(), width);
  layout.ensureSpace(Math.max(52, bodyLines.length * 11 + 34));
  renderSectionTitle(doc, signal.title, margin, layout);
  if (bodyLines.length) {
    doc.text(bodyLines, margin, layout.getY());
    layout.advanceY(bodyLines.length * 11 + 10);
  }
}

export function renderClientUrgencyBlock({ doc, signal, layout }) {
  if (!signal) return;
  const margin = layout.margin;
  const width = layout.pageWidth - 2 * margin;
  const lines = splitSafe(doc, signal.details, width);
  layout.ensureSpace(Math.max(52, lines.length * 11 + 34));
  renderSectionTitle(doc, signal.title, margin, layout);
  if (lines.length) {
    doc.text(lines, margin, layout.getY());
    layout.advanceY(lines.length * 11 + 10);
  }
}

function buildTierCardMetrics(doc, card, cardWidth) {
  const innerWidth = cardWidth - 20;
  const titleLines = splitSafe(doc, card?.name || "", innerWidth);
  const priceLines = splitSafe(doc, card?.price || "", innerWidth);
  const detailsLines = splitSafe(doc, card?.details || "", innerWidth);
  const height = 16 + titleLines.length * 11 + 4 + priceLines.length * 12 + 6 + detailsLines.length * 10 + 14;
  return {
    titleLines,
    priceLines,
    detailsLines,
    height,
  };
}

function renderTierCard(doc, x, y, w, card, metrics) {
  drawCardContainer(doc, x, y, w, metrics.height);
  let ty = y + 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (metrics.titleLines.length) {
    doc.text(metrics.titleLines, x + 10, ty);
    ty += metrics.titleLines.length * 11 + 4;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (metrics.priceLines.length) {
    doc.text(metrics.priceLines, x + 10, ty);
    ty += metrics.priceLines.length * 12 + 6;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (metrics.detailsLines.length) {
    doc.text(metrics.detailsLines, x + 10, ty);
  }
}

export function renderClientTiersBlock({ doc, signal, layout }) {
  if (!signal || !Array.isArray(signal.cards) || signal.cards.length !== 3) return;
  const margin = layout.margin;
  const pageWidth = layout.pageWidth;
  const gap = 12;
  const contentWidth = pageWidth - 2 * margin;

  layout.ensureSpace(58);
  renderSectionTitle(doc, signal.title, margin, layout);
  const introLines = splitSafe(doc, signal.intro || "", contentWidth);
  if (introLines.length) {
    doc.text(introLines, margin, layout.getY());
    layout.advanceY(introLines.length * 10 + 10);
  }

  const columnWidth = (contentWidth - gap * 2) / 3;
  const mustStack = columnWidth < 150;

  if (mustStack) {
    for (const card of signal.cards) {
      const metrics = buildTierCardMetrics(doc, card, contentWidth);
      layout.ensureSpace(metrics.height + 12);
      const y = layout.getY();
      renderTierCard(doc, margin, y, contentWidth, card, metrics);
      layout.advanceY(metrics.height + 12);
    }
    return;
  }

  const metricsByCard = signal.cards.map((card) => buildTierCardMetrics(doc, card, columnWidth));
  const rowHeight = Math.max(...metricsByCard.map((m) => m.height));
  layout.ensureSpace(rowHeight + 14);
  const y = layout.getY();

  signal.cards.forEach((card, idx) => {
    const x = margin + idx * (columnWidth + gap);
    const metrics = metricsByCard[idx];
    renderTierCard(doc, x, y, columnWidth, card, metrics);
  });

  layout.advanceY(rowHeight + 14);
}

export function renderClientPdfSignals({ doc, signals, layout }) {
  renderClientLeanBadgeBlock({ doc, signal: signals?.leanBadge, layout });
  renderClientTiersBlock({ doc, signal: signals?.tiers, layout });
  renderClientUrgencyBlock({ doc, signal: signals?.urgency, layout });
}
