/**
 * Modo Estrategista: precificação por valor com VCE, ROIx e CDO.
 * Não altera compute/projectNet. Usa precoBase = projectNet quando projectHours > 0.
 */

export function computeStrategistMetrics(params) {
  const { precoBase, valorGanhoEstimado12m, custoOportunidadeMensal } = params || {};
  const pb = Number(precoBase);
  const ganho = Number(valorGanhoEstimado12m);
  const custo = Math.max(0, Number(custoOportunidadeMensal) || 0);

  const invalid = { vce: null, roix: null, cdo: null, vceLabel: null, viabilidadeAlerta: false, ok: false };
  if (!Number.isFinite(pb) || pb <= 0) return invalid;

  let vce = null;
  let roix = null;
  if (Number.isFinite(ganho) && ganho > 0) {
    vce = (pb / ganho) * 100;
    roix = ganho / pb;
  }

  const cdo = Number.isFinite(custo) ? custo / 30 : null;

  let vceLabel = null;
  if (vce != null) {
    if (vce < 5) vceLabel = "captura conservadora";
    else if (vce > 20) vceLabel = "captura elevada";
  }

  const viabilidadeAlerta = Number.isFinite(ganho) && ganho > 0 && ganho < pb;

  return {
    vce,
    roix,
    cdo,
    vceLabel,
    viabilidadeAlerta,
    ok: true,
  };
}

export function formatStrategistValue(value, fmt) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (fmt === "percent") return `${Number(value.toFixed(1))}%`;
  if (fmt === "money") return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(value);
}

export const STRATEGIST_CAVEAT = "Estimativa baseada nas premissas informadas; sem garantias.";
