const NEGOTIATION_CAVEAT = "Estimativa sujeita à execução e variáveis operacionais.";

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round1(n) {
  return Number(num(n, 0).toFixed(1));
}

function round2(n) {
  return Number(num(n, 0).toFixed(2));
}

function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export const SCOPE_SHIELD_WEIGHTS = {
  historicoMuitasAlteracoes: 24,
  comunicacaoFragmentada: 18,
  tomadorIndefinido: 22,
  escopoIncompleto: 22,
  urgenciaSemBriefing: 14,
};

export function computeScopeShielding(input = {}) {
  const flags = {
    historicoMuitasAlteracoes: !!input.historicoMuitasAlteracoes,
    comunicacaoFragmentada: !!input.comunicacaoFragmentada,
    tomadorIndefinido: !!input.tomadorIndefinido,
    escopoIncompleto: !!input.escopoIncompleto,
    urgenciaSemBriefing: !!input.urgenciaSemBriefing,
  };
  const score = Object.entries(SCOPE_SHIELD_WEIGHTS).reduce((acc, [k, w]) => acc + (flags[k] ? w : 0), 0);
  let level = "low";
  let min = 0;
  let max = 5;
  let t = clamp(score / 30, 0, 1);
  if (score >= 65) {
    level = "high";
    min = 12;
    max = 18;
    t = clamp((score - 65) / 35, 0, 1);
  } else if (score >= 30) {
    level = "medium";
    min = 8;
    max = 12;
    t = clamp((score - 30) / 35, 0, 1);
  }
  const markupPct = round1(clamp(min + (max - min) * t, 0, 18));
  return {
    score,
    level,
    markupPct,
    capPct: 18,
    flags,
  };
}

export function computeDynamicScarcityMarkup(ocupacaoAgenda) {
  const occ = clamp(num(ocupacaoAgenda, 0), 0, 100);
  let markupPct = 0;
  if (occ <= 60) {
    markupPct = 0;
  } else if (occ <= 80) {
    markupPct = ((occ - 60) / 20) * 12;
  } else if (occ <= 95) {
    markupPct = 12 + ((occ - 80) / 15) * 13;
  } else {
    markupPct = 30;
  }
  return {
    ocupacaoAgenda: occ,
    markupPct: round1(clamp(markupPct, 0, 30)),
    capPct: 30,
  };
}

export function computeRoiAnchor(input = {}) {
  const impacto = String(input.impactoNoNegocio || "baixo").toLowerCase();
  const area = toText(input.areaImpacto, "a operação");
  const enabled = impacto === "critico";
  const text = enabled
    ? `Considerando o impacto crítico desta solução para ${area}, este investimento representa uma alocação estratégica para mitigação de risco e ganhos de eficiência estimados.`
    : "";
  return {
    enabled,
    text,
    caveat: NEGOTIATION_CAVEAT,
  };
}

export function computeRunwaySummary(input = {}) {
  const reservaAtual = Math.max(0, num(input.reservaAtual, 0));
  const reservaMetaMeses = clamp(num(input.reservaMetaMeses, 6), 1, 60);
  const derivado = Math.max(0, num(input.targetIncome, 0) + num(input.monthlyCosts, 0));
  const explicito = Math.max(0, num(input.custoPessoalMensal, 0));
  const custoMensal = explicito > 0 ? explicito : derivado;
  const projetoLiquido = Math.max(0, num(input.projectNet, 0));
  const metaReserva = custoMensal * reservaMetaMeses;

  const runwayMesesAtual = custoMensal > 0 ? reservaAtual / custoMensal : 0;
  const runwayMesesPosProjeto = custoMensal > 0 ? (reservaAtual + projetoLiquido) / custoMensal : 0;
  const faltante = Math.max(0, metaReserva - reservaAtual);
  const projetosNecessarios = projetoLiquido > 0 ? Math.ceil(faltante / projetoLiquido) : null;

  return {
    reservaMetaMeses,
    custoPessoalMensal: round2(custoMensal),
    custoFonte: explicito > 0 ? "explicito" : "derivado",
    metaReserva: round2(metaReserva),
    runwayMesesAtual: round1(runwayMesesAtual),
    runwayDiasAtual: Math.round(runwayMesesAtual * 30),
    runwayMesesPosProjeto: round1(runwayMesesPosProjeto),
    runwayDiasPosProjeto: Math.round(runwayMesesPosProjeto * 30),
    projetosNecessarios,
    caveat: NEGOTIATION_CAVEAT,
  };
}

export function generateJustificationBlocks(input = {}) {
  const s = input.state || {};
  const scopeShield = input.scopeShield || { level: "low", markupPct: 0 };
  const scarcity = input.scarcity || { markupPct: 0 };
  const roi = input.roi || { enabled: false, text: "" };
  const projectLabel = toText(s.clientName, "o projeto");
  const prazo = String(s.prazoEntrega || "normal").toLowerCase();
  const criticidade = String(s.criticidadeNegocio || "media").toLowerCase();
  const impacto = String(s.impactoNoNegocio || "medio").toLowerCase();

  const resumoExecutivo =
    `Resumo executivo: a estimativa para ${projectLabel} considera capacidade operacional, risco de execução e contexto de priorização. ` +
    `Os ajustes de negociação foram aplicados de forma controlada (${scopeShield.markupPct || 0}% de gestão de expectativa e ${scarcity.markupPct || 0}% de conveniência).`;

  const justificativaTecnica =
    `Justificativa técnica: a proposta utiliza parâmetros de escopo, urgência e disponibilidade para reduzir assimetria de risco entre execução e expectativa. ` +
    `A recomendação final é orientada por estimativa robusta, sem promessa de resultado garantido.`;

  let justificativaPrioridadeRisco = "";
  if (prazo === "curto" || prazo === "urgente" || criticidade === "alta" || impacto === "critico" || roi.enabled) {
    justificativaPrioridadeRisco =
      `Justificativa de prioridade/risco: o cenário indica prioridade elevada e maior sensibilidade de negócio. ` +
      `Por isso, a reserva de capacidade e governança de escopo foram incorporadas para preservar previsibilidade da entrega.`;
  }

  return {
    resumoExecutivo,
    justificativaTecnica,
    justificativaPrioridadeRisco,
    caveat: NEGOTIATION_CAVEAT,
  };
}
