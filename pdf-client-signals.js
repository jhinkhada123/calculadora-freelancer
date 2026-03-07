import { resolveFeatureFlags } from "./feature-flags.js";
import { clampPct, roundMoney, roundPct, toFiniteNumber } from "./proposal-metrics.js";

const EMPTY_SIGNALS = Object.freeze({
  leanBadge: null,
  urgency: null,
  tiers: null,
});

const CLIENT_SIGNAL_KEYS = Object.freeze([
  "currency",
  "agencyEconomiaValor",
  "agencyEconomiaPercentual",
  "agencyCost",
  "proposalCost",
  "custoInacaoSemanal",
  "custoInacaoMensal",
  "valorGanhoEstimado12m",
  "vcePct",
  "tierEnxuto",
  "tierEssencial",
  "tierPremium",
]);

function normalizeCopy(text) {
  const value = String(text ?? "").trim().replace(/\s+/g, " ");
  return value.length > 320 ? `${value.slice(0, 317)}...` : value;
}

function pickClientSafeSubset(input) {
  const source = input && typeof input === "object" ? input : {};
  const out = {};
  for (const key of CLIENT_SIGNAL_KEYS) {
    out[key] = source[key];
  }
  return out;
}

function toPositiveMoney(value) {
  const n = toFiniteNumber(value, NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundMoney(n);
}

function toPositivePct(value) {
  const n = toFiniteNumber(value, NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundPct(clampPct(n));
}

function normalizeCurrency(value) {
  const code = String(value || "BRL").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "BRL";
}

function formatMoney(value, currency) {
  const n = toPositiveMoney(value);
  if (n == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: normalizeCurrency(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPct(value) {
  const n = toPositivePct(value);
  if (n == null) return null;
  return `${n.toFixed(1)}%`;
}

function buildLeanBadgeSignal(safe, currency, flags) {
  if (!flags.pdf_lean_badge_enabled) return null;
  const economiaPct = formatPct(safe.agencyEconomiaPercentual);
  const economiaValor = formatMoney(safe.agencyEconomiaValor, currency);
  const agencyCost = formatMoney(safe.agencyCost, currency);
  const proposalCost = formatMoney(safe.proposalCost, currency);
  const agencyCostRaw = toPositiveMoney(safe.agencyCost);
  const proposalCostRaw = toPositiveMoney(safe.proposalCost);
  if (!economiaPct || !economiaValor || !agencyCost || !proposalCost) return null;
  if (!Number.isFinite(agencyCostRaw) || !Number.isFinite(proposalCostRaw) || agencyCostRaw <= proposalCostRaw) {
    return null;
  }

  return {
    title: "Eficiencia Lean",
    headline: normalizeCopy(`Economia estimada de ${economiaPct} frente ao modelo tradicional de agencia.`),
    details: normalizeCopy(`Custo agencia: ${agencyCost}. Proposta atual: ${proposalCost}. Diferenca estimada: ${economiaValor}.`),
  };
}

function buildUrgencySignal(safe, currency, flags) {
  if (!flags.pdf_urgency_enabled) return null;
  const semanal = formatMoney(safe.custoInacaoSemanal, currency);
  const mensal = formatMoney(safe.custoInacaoMensal, currency);
  const ganho12m = formatMoney(safe.valorGanhoEstimado12m, currency);
  const vcePct = formatPct(safe.vcePct);
  if (!semanal || !mensal) return null;

  const base = `Cada semana sem iniciar o projeto pode representar cerca de ${semanal} de ganho nao capturado.`;
  const mensalLine = `Impacto mensal estimado: ${mensal}.`;
  const referencia = ganho12m ? `Referencia de ganho em 12 meses: ${ganho12m}.` : "";
  const vceLine = vcePct ? `VCE estimado: ${vcePct}.` : "";

  return {
    title: "Custo de Inacao",
    details: normalizeCopy(`${base} ${mensalLine} ${referencia} ${vceLine}`.trim()),
  };
}

function buildTierSignal(safe, currency, flags) {
  if (!flags.pdf_tiers_enabled) return null;
  const enxuto = formatMoney(safe.tierEnxuto, currency);
  const essencial = formatMoney(safe.tierEssencial, currency);
  const premium = formatMoney(safe.tierPremium, currency);
  if (!enxuto || !essencial || !premium) return null;

  return {
    title: "Arquitetura de Escolhas",
    intro: "Tres caminhos de entrega para facilitar decisao executiva sem perder clareza de escopo.",
    cards: [
      {
        name: "Enxuto",
        price: enxuto,
        details: "Co-gestao com escopo inflexivel e foco em custo minimo.",
      },
      {
        name: "Essencial",
        price: essencial,
        details: "Plano recomendado com equilibrio entre previsibilidade e resultado.",
      },
      {
        name: "Premium",
        price: premium,
        details: "Entrega turnkey com prioridade alta e cobertura de volatilidade.",
      },
    ],
  };
}

/**
 * Build view model for client PDF blocks.
 * Only consumes clientSafe, never internalOnly.
 */
export function buildClientPdfSignals(clientSafe, flags = {}, currency = "BRL") {
  const fl = resolveFeatureFlags(flags);
  const safe = pickClientSafeSubset(clientSafe);
  const curr = normalizeCurrency(currency || safe.currency || "BRL");

  return {
    leanBadge: buildLeanBadgeSignal(safe, curr, fl),
    urgency: buildUrgencySignal(safe, curr, fl),
    tiers: buildTierSignal(safe, curr, fl),
  };
}

export function flattenClientPdfSignalsText(signals) {
  if (!signals || typeof signals !== "object") return "";
  const parts = [];
  if (signals.leanBadge) {
    parts.push(signals.leanBadge.title, signals.leanBadge.headline, signals.leanBadge.details);
  }
  if (signals.urgency) {
    parts.push(signals.urgency.title, signals.urgency.details);
  }
  if (signals.tiers && Array.isArray(signals.tiers.cards)) {
    parts.push(signals.tiers.title, signals.tiers.intro);
    for (const card of signals.tiers.cards) {
      parts.push(card?.name, card?.price, card?.details);
    }
  }
  return parts.filter(Boolean).join(" \n ");
}

export { EMPTY_SIGNALS };
