/**
 * Sanitiza estado da aplicação para prevenir tipos inválidos, NaN/Infinity,
 * strings gigantes e enums inválidos. Usado em todos os pontos de entrada:
 * loadState, applyQueryParams, importConfig, persistState, buildShareUrl, initClientView.
 *
 * Não altera lógica de cálculo financeiro — apenas valida e normaliza.
 */

/** Padrão do produto: nomes 140 chars. */
const STRING_MAX_LEN = {
  professionalName: 140,
  clientName: 140,
  areaImpacto: 140,
  validityDate: 10,
  currency: 10,
  default: 500,
};

const ENUM_WHITELIST = {
  scopeVolatility: ["low", "medium", "high"],
  complexidadeProjeto: ["baixa", "media", "alta"],
  prazoEntrega: ["normal", "curto", "urgente"],
  criticidadeNegocio: ["baixa", "media", "alta"],
  envolvimentoCliente: ["baixo", "medio", "alto"],
  impactoNoNegocio: ["baixo", "medio", "alto", "critico"],
  pdfInternalFormat: ["complete", "compact"],
  uiMode: ["essencial", "estrategista", "comparacao", "governanca"],
};

const VALIDITY_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DDMMYYYY_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const NUMBER_CLAMP = {
  targetIncome: [0, 1e12],
  monthlyCosts: [0, 1e12],
  taxRate: [0, 100],
  profitMargin: [0, 100],
  buffer: [0, 100],
  utilization: [0, 100],
  hoursPerDay: [0, 24],
  daysPerWeek: [0, 7],
  vacationWeeks: [0, 52],
  projectHours: [0, 1e6],
  projectNet: [0, 1e12],
  scopeRisk: [0, 100],
  discount: [0, 100],
  assetValue: [0, 1e12],
  assetUsefulLifeMonths: [0, 600],
  opportunityRateAnnual: [0, 1000],
  occupancyRate: [0, 100],
  weeklyHours: [0, 168],
  ocupacaoAgenda: [0, 100],
  reservaMetaMeses: [0, 120],
  reservaAtual: [0, 1e12],
  custoPessoalMensal: [0, 1e12],
  valorGanhoEstimado12m: [0, 1e12],
  custoOportunidadeMensal: [0, 1e12],
};

function clampNum(value, key) {
  let n;
  if (typeof value === "string") {
    n = Number(value.replace(",", "."));
  } else {
    n = Number(value);
  }
  if (n !== n) return 0;
  const range = NUMBER_CLAMP[key];
  if (!range) return Number.isFinite(n) ? n : 0;
  if (n === Infinity) return range[1];
  if (n === -Infinity) return range[0];
  return Math.min(range[1], Math.max(range[0], n));
}

function sanitizeString(value, key) {
  const s = String(value ?? "").trim();
  const max = STRING_MAX_LEN[key] ?? STRING_MAX_LEN.default;
  return s.length > max ? s.slice(0, max) : s;
}

function sanitizeValidityDate(value) {
  const s = String(value ?? "").trim();
  if (VALIDITY_DATE_REGEX.test(s)) return s;
  const ddmm = s.match(DDMMYYYY_REGEX);
  if (ddmm) {
    const [, d, m, y] = ddmm;
    const pad = (n) => String(n).padStart(2, "0");
    return `${y}-${pad(m)}-${pad(d)}`;
  }
  return "";
}

function sanitizeEnum(value, key, defaultValue) {
  const allowed = ENUM_WHITELIST[key];
  if (!allowed) return value;
  const v = String(value ?? "").toLowerCase().trim();
  return allowed.includes(v) ? v : (defaultValue ?? "");
}

/**
 * Sanitiza estado bruto usando defaults como whitelist e referência de tipos.
 * @param {Object} defaults - Estado padrão (ex: defaultState())
 * @param {Object} raw - Estado bruto a sanitizar
 * @returns {Object} Estado sanitizado
 */
export function sanitizeState(defaults, raw) {
  if (!defaults || typeof defaults !== "object") return defaults ?? {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...defaults };

  const out = { ...defaults };

  for (const k of Object.keys(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(defaults, k)) continue;
    const defVal = defaults[k];
    const rawVal = raw[k];

    if (rawVal === undefined || rawVal === null) continue;

    if (typeof defVal === "number") {
      out[k] = clampNum(rawVal, k);
      continue;
    }

    if (typeof defVal === "boolean") {
      out[k] = !!rawVal;
      continue;
    }

    if (typeof defVal === "string") {
      if (k === "validityDate") {
        out[k] = sanitizeValidityDate(rawVal);
      } else if (ENUM_WHITELIST[k]) {
        out[k] = sanitizeEnum(rawVal, k, defVal);
      } else {
        out[k] = sanitizeString(rawVal, k);
      }
      continue;
    }

    // Fallback: manter default
  }

  return out;
}
