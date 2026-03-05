function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round1(value) {
  return Number(num(value, 0).toFixed(1));
}

export function computeSubscores(ctx) {
  const scopeFactor = num(ctx.scopeFactor, 1);
  const occupancyRate = clamp(num(ctx.occupancyRate, 0), 0, 100);
  const exhaustionFactor = num(ctx.exhaustionFactor, 1);
  const denominator = num(ctx.denominator, 1);

  const riscoEscopo = clamp(((scopeFactor - 1) / 0.25) * 100, 0, 100);
  const ocupacaoPressao = occupancyRate <= 60 ? 0 : clamp(((occupancyRate - 60) / 40) * 100, 0, 100);
  const exaustaoPressao = exhaustionFactor <= 1 ? 0 : clamp(((exhaustionFactor - 1) / 0.6) * 100, 0, 100);
  const margemFragilidade = denominator >= 0.6 ? 0 : clamp(((0.6 - denominator) / 0.4) * 100, 0, 100);

  return { riscoEscopo, ocupacaoPressao, exaustaoPressao, margemFragilidade };
}

export function computeRiskScore(ctx) {
  const subs = computeSubscores(ctx || {});
  const raw =
    0.35 * subs.riscoEscopo +
    0.25 * subs.ocupacaoPressao +
    0.2 * subs.exaustaoPressao +
    0.2 * subs.margemFragilidade;
  const score = clamp(raw, 0, 100);
  return {
    score: round1(score),
    subscores: {
      riscoEscopo: round1(subs.riscoEscopo),
      ocupacaoPressao: round1(subs.ocupacaoPressao),
      exaustaoPressao: round1(subs.exaustaoPressao),
      margemFragilidade: round1(subs.margemFragilidade),
    },
  };
}

export function riskNarrative(result) {
  const score = num(result?.score, 0);
  if (score >= 75) return "Risco alto: priorize margem de segurança e revisão de premissas.";
  if (score >= 45) return "Risco moderado: operação viável, mas com sensibilidade em ocupação e escopo.";
  return "Risco controlado: premissas com boa folga operacional no cenário atual.";
}
