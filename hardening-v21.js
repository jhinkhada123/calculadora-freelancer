function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function toMs(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function validateEndpointUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol === "https:") return { ok: true, reason: "HTTPS_OK" };
    if (url.protocol === "http:") {
      const host = (url.hostname || "").toLowerCase();
      const localhost = host === "localhost" || host === "127.0.0.1";
      return localhost
        ? { ok: true, reason: "HTTP_LOCAL_OK" }
        : { ok: false, reason: "HTTP_EXTERNAL_BLOCKED" };
    }
    return { ok: false, reason: "UNSUPPORTED_PROTOCOL" };
  } catch {
    return { ok: false, reason: "INVALID_URL" };
  }
}

export function shouldTrackRiskScoreView(params = {}) {
  const score = num(params.score, NaN);
  if (!Number.isFinite(score)) {
    return { shouldTrack: false, next: params.prev || null };
  }
  const mode = String(params.mode || "advanced");
  const model = String(params.model || "deterministic");
  const nowMs = toMs(params.nowMs);
  const threshold = num(params.threshold, 1.0);
  const cooldownMs = Math.max(0, num(params.cooldownMs, 10_000));
  const prev = params.prev && typeof params.prev === "object" ? params.prev : null;
  if (!prev) {
    return {
      shouldTrack: true,
      next: { score, mode, model, sentAtMs: nowMs },
    };
  }
  const modeChanged = prev.mode !== mode || prev.model !== model;
  if (modeChanged) {
    return {
      shouldTrack: true,
      next: { score, mode, model, sentAtMs: nowMs },
    };
  }
  const elapsed = nowMs - toMs(prev.sentAtMs);
  if (elapsed < cooldownMs) {
    return { shouldTrack: false, next: prev };
  }
  const delta = Math.abs(score - num(prev.score, score));
  if (delta < threshold) {
    return { shouldTrack: false, next: prev };
  }
  return {
    shouldTrack: true,
    next: { score, mode, model, sentAtMs: nowMs },
  };
}

export function ensurePdfYSpace(y, needed, pageHeight, margin, footerReserve = 72) {
  const safeY = num(y, margin);
  const need = Math.max(0, num(needed, 0));
  const maxY = num(pageHeight, 842) - num(margin, 56) - Math.max(0, num(footerReserve, 72));
  if (safeY + need > maxY) {
    return { y: num(margin, 56), addPage: true };
  }
  return { y: safeY, addPage: false };
}

export function advancePdfY(y, increment) {
  return num(y, 0) + Math.max(0, num(increment, 0));
}

export function advancePdfYByLines(y, lineCount, lineHeight = 12, spacingAfter = 0) {
  const lines = Math.max(0, Math.floor(num(lineCount, 0)));
  const height = Math.max(0, num(lineHeight, 0));
  const spacing = Math.max(0, num(spacingAfter, 0));
  return advancePdfY(y, (lines * height) + spacing);
}

function splitEssentialRevenue(state, revenueTarget) {
  const income = Math.max(0, num(state.targetIncome, 0));
  const costs = Math.max(0, num(state.monthlyCosts, 0));
  const essentialBase = income + costs;
  const essentialOverhead = Math.max(0, revenueTarget - essentialBase);
  return [
    { key: "income", label: "Renda líquida desejada", value: income, color: "#34d399" },
    { key: "costs", label: "Custos fixos", value: costs, color: "#60a5fa" },
    { key: "core", label: "Encargos e margem essenciais", value: essentialOverhead, color: "#a78bfa" },
  ];
}

export function buildCompositionParts(state, result, ctx) {
  const revenueTarget = num(result?.revenueTarget, 0);
  if (!(result && result.ok) || revenueTarget <= 0) return [];

  if (!(ctx && ctx.mode === "advanced" && ctx.advanced && ctx.advanced.ok && ctx.essential && ctx.essential.ok)) {
    const baseParts = splitEssentialRevenue(state || {}, revenueTarget);
    const total = baseParts.reduce((acc, p) => acc + p.value, 0) || 1;
    return baseParts.map((p) => ({ ...p, percent: (p.value / total) * 100 }));
  }

  const essentialRevenue = Math.max(0, num(ctx.essential.revenueTarget, 0));
  const baseParts = splitEssentialRevenue(state || {}, essentialRevenue);
  const deltaAdvanced = Math.max(0, revenueTarget - essentialRevenue);

  const denominator = clamp(num(ctx.advanced.data?.denominator, 1), 0.01, 1);
  const depGross = Math.max(0, num(ctx.advanced.data?.depreciationMonthly, 0) / denominator);
  const oppGross = Math.max(0, num(ctx.advanced.data?.opportunityCostMonthly, 0) / denominator);
  const cappedDep = Math.min(depGross, deltaAdvanced);
  const cappedOpp = Math.min(oppGross, Math.max(0, deltaAdvanced - cappedDep));
  const adj = Math.max(0, deltaAdvanced - cappedDep - cappedOpp);

  const allParts = [
    ...baseParts,
    { key: "dep", label: "Depreciação (ajuste avançado)", value: cappedDep, color: "#22d3ee" },
    { key: "opp", label: "Custo de oportunidade (ajuste avançado)", value: cappedOpp, color: "#f97316" },
    { key: "adj", label: "Ajuste risco/escassez/exaustão", value: adj, color: "#f43f5e" },
  ];
  const total = allParts.reduce((acc, p) => acc + p.value, 0) || 1;
  return allParts.map((p) => ({ ...p, percent: (p.value / total) * 100 }));
}
