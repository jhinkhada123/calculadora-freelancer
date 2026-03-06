/**
 * Renderers puros de cada bloco narrativo do PDF executivo.
 * @see docs/PDF-PROPOSTA-EXECUTIVA-PLANO.md § 3
 */

/**
 * @param {Object} doc - jsPDF
 * @param {Object} context - PdfContext
 * @param {Object} design - PdfDesignTokens
 * @param {Object} layout - { ensureSpace, advanceY, getY, margin, pageWidth }
 * @param {Object} assets - { logoDataUrl, brandName }
 * @param {Object} deps - { writeWrapped }
 */
export function renderExecutiveHeader(doc, context, design, layout, assets, deps) {
  const { margin, pageWidth, blockGap } = design;
  const { ensureSpace, advanceY } = layout;
  const { writeWrapped } = deps;

  if (assets?.logoDataUrl) {
    try {
      const fmt = assets.logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      ensureSpace(84, { keepTogether: true });
      doc.addImage(assets.logoDataUrl, fmt, (pageWidth - 180) / 2, layout.getY(), 180, 60);
      advanceY(84);
    } catch (_) {
      // omitir logo em caso de erro
    }
  }

  doc.setFont(design.fonts.body, design.fonts.bodyStyle);
  doc.setFontSize(11);
  doc.text(assets?.brandName || "Proposta", margin, layout.getY());
  advanceY(16);

  const profLabel =
    context.state?.professionalName?.trim() || "Profissional Responsável";
  doc.text(`Responsável: ${profLabel}`, margin, layout.getY());
  advanceY(18);

  if (context.state?.clientName) {
    doc.text(`Cliente / Projeto: ${context.state.clientName}`, margin, layout.getY());
    advanceY(18);
  }

  if (context.state?.validityDate) {
    doc.text(`Data: ${context.state.validityDate}`, margin, layout.getY());
    advanceY(24);
  }

  doc.setFont(design.fonts.title, design.fonts.titleStyle);
  doc.setFontSize(14);
  doc.text(
    "Proposta Estratégica para " + (context.state?.clientName || "Cliente"),
    margin,
    layout.getY()
  );
  advanceY(blockGap);
}

/**
 * Ancoragem de valor — fallback quando strategist OFF ou sem dados.
 */
export function renderValueAnchor(doc, context, design, layout, assets, deps) {
  const { margin, blockGap } = design;
  const { ensureSpace, advanceY } = layout;
  const { writeWrapped } = deps;

  ensureSpace(60, { keepTogether: true, keepWithNext: true });
  doc.setFont(design.fonts.title, design.fonts.titleStyle);
  doc.setFontSize(12);
  doc.text("Ancoragem de Valor", margin, layout.getY());
  doc.setFont(design.fonts.body, design.fonts.bodyStyle);
  doc.setFontSize(11);
  advanceY(16);

  const hasStrat = context.strategist?.ok && context.strategist?.vce != null;
  if (hasStrat && deps.formatStrategistValue && deps.fmtMoney) {
    const curr = context.state?.currency || "BRL";
    const vceStr = deps.formatStrategistValue(context.strategist.vce, "percent");
    const roixStr =
      context.strategist.roix != null ? `${deps.fmtNumber(context.strategist.roix, 1)}x` : "—";
    const cdoStr =
      context.strategist.cdo != null ? deps.fmtMoney(context.strategist.cdo, curr) : "—";
    doc.text(
      `Valor Ganho Estimado: VCE ${vceStr} | ROIx ${roixStr} | CDO ${cdoStr}`,
      margin,
      layout.getY()
    );
    advanceY(14);
    if (deps.STRATEGIST_CAVEAT && writeWrapped) {
      writeWrapped(deps.STRATEGIST_CAVEAT, { lineHeight: 10, spacingAfter: 8 });
    }
  } else {
    doc.text(context.ancoragemFallback || "", margin, layout.getY());
    advanceY(16);
  }
  advanceY(blockGap);
}

/**
 * Escopo e prazo.
 */
export function renderScopeAndTimeline(doc, context, design, layout, assets, deps) {
  const { margin, blockGap } = design;
  const { ensureSpace, advanceY } = layout;
  const { fmtNumber } = deps;

  ensureSpace(80, { keepTogether: true, keepWithNext: true });
  doc.setFont(design.fonts.title, design.fonts.titleStyle);
  doc.setFontSize(12);
  doc.text("Escopo e Prazo", margin, layout.getY());
  doc.setFont(design.fonts.body, design.fonts.bodyStyle);
  doc.setFontSize(11);
  advanceY(18);

  doc.text("Escopo definido conforme objetivos e entregáveis acordados.", margin, layout.getY());
  advanceY(16);

  const s = context.state || {};
  const prazoDias = Math.ceil(
    (s.projectHours / Math.max(1, s.hoursPerDay || 8)) *
      (100 / Math.max(1, s.utilization || 80))
  );
  doc.text(`Prazo estimado: ${fmtNumber(prazoDias, 0)} dias úteis`, margin, layout.getY());
  advanceY(blockGap);
}

/**
 * Lógica de precificação (resumo consultivo).
 */
export function renderPricingLogicSummary(doc, context, design, layout, assets, deps) {
  const { margin, blockGap } = design;
  const { ensureSpace, advanceY } = layout;
  const { writeWrapped, fmtMoney } = deps;

  ensureSpace(60, { keepTogether: true, keepWithNext: true });
  doc.setFont(design.fonts.title, design.fonts.titleStyle);
  doc.setFontSize(11);
  doc.text("Lógica de Precificação", margin, layout.getY());
  doc.setFont(design.fonts.body, design.fonts.bodyStyle);
  doc.setFontSize(10);
  advanceY(14);

  const curr = context.state?.currency || "BRL";
  const hasStrat = context.strategist?.ok && context.strategist?.cdo != null;
  const cdoVal = hasStrat ? deps.fmtMoney(context.strategist.cdo, curr) : "—";
  writeWrapped(
    `Cronograma: estimativa consultiva; não constitui promessa de prazo. CDO (custo diário de oportunidade): ${cdoVal}.`,
    { lineHeight: 11, spacingAfter: 8 }
  );
  advanceY(blockGap);
}

/**
 * Recomendação final.
 */
export function renderRecommendation(doc, context, design, layout, assets, deps) {
  const { margin, blockGap } = design;
  const { ensureSpace, advanceY } = layout;
  const { writeWrapped } = deps;

  if (!context.proposalText) return;

  ensureSpace(140, { keepTogether: true, keepWithNext: true });
  doc.setFont(design.fonts.title, design.fonts.titleStyle);
  doc.setFontSize(12);
  doc.text("Recomendação Final", margin, layout.getY());
  doc.setFont(design.fonts.body, design.fonts.bodyStyle);
  doc.setFontSize(11);
  advanceY(18);
  writeWrapped(context.proposalText, { lineHeight: 14, spacingAfter: 24 });
}

/**
 * Investimento do Projeto.
 */
export function renderInvestment(doc, context, design, layout, assets, deps) {
  const { margin } = design;
  const { ensureSpace, advanceY } = layout;
  const { fmtMoney } = deps;

  ensureSpace(80, { keepTogether: true, keepWithNext: true });
  doc.setFont(design.fonts.title, design.fonts.titleStyle);
  doc.setFontSize(12);
  doc.text("Investimento do Projeto", margin, layout.getY());
  doc.setFont(design.fonts.body, design.fonts.bodyStyle);
  advanceY(20);

  const curr = context.state?.currency || "BRL";
  if (context.projectOk) {
    doc.setFont(design.fonts.title, design.fonts.titleStyle);
    doc.setFontSize(18);
    doc.text(
      fmtMoney(Number(context.effective?.projectNet || 0), curr),
      margin,
      layout.getY()
    );
    doc.setFont(design.fonts.body, design.fonts.bodyStyle);
    doc.setFontSize(11);
  } else {
    doc.text("Preencha as horas estimadas para calcular o investimento.", margin, layout.getY());
  }
  advanceY(26);
}

/**
 * Rodapé viral (até 3 frases no Completo).
 */
export function renderViralFooter(doc, context, design, layout, assets, deps) {
  const { margin } = design;
  const { ensureSpace } = layout;
  const { writeWrapped } = deps;

  const maxPhrases = design.format === "compact" ? 1 : 3;
  const viralPhrases = (context.antiDiscountPhrases || []).slice(0, maxPhrases);
  if (viralPhrases.length === 0) return;

  ensureSpace(48, { keepTogether: true });
  doc.setFontSize(9);
  viralPhrases.forEach((p) => {
    writeWrapped(`• ${p}`, { lineHeight: 10, spacingAfter: 4 });
  });
}
