import { escapeHtml } from "./utils/escape.js";
import { sanitizeState } from "./utils/sanitize-state.js";
import { normalizeTextForPdf, PDF_FIELD_MAX } from "./utils/normalize-text-for-pdf.js";
import { readLocal, writeLocal, removeLocal, readSession, writeSession, STORAGE_KEYS } from "./utils/storage.js";
import { resolveFeatureFlags } from "./feature-flags.js";
import { UI_MODE_VALUES, TAB_MODE_LABELS, TAB_CONTEXT_HINTS, TAB_PANELS, TAB_IDS, normalizeUiMode } from "./ui-mode-constants.js";
import { buildProposalMetrics, pickPublicExportSafe } from "./proposal-metrics.js";
import { computeTierPricing } from "./proposal-tiers.js";
import { TRACEABILITY_INPUT_KEYS_V1, TRACEABILITY_REASON_TO_INPUT_KEY_V1, isTraceabilityMetricV1 } from "./src/domain/pricing/traceability-v1.js";

let compute, hasAcceptedTerms, recordAcceptance, getSessionId, textChecksum, TERMS_VERSION, appendAuditSnapshot, LEGAL_DISCLAIMER, evaluateBenchmarkAlerts, getAuditTrail;
let computeAdvancedPricing, deriveHistoricalVarianceSamples, computeAgencyEquivalent;
let computePricingEngineV1;
let computeRiskScore, riskNarrative, trackEvent;
let computeStrategistMetrics, formatStrategistValue, STRATEGIST_CAVEAT;
let computeScopeShielding, computeDynamicScarcityMarkup, computeRunwaySummary, computeRoiAnchor, generateJustificationBlocks;
let validateEndpointUrl, shouldTrackRiskScoreView, buildCompositionPartsModel, ensurePdfYSpaceModel, advancePdfYModel, advancePdfYByLinesModel;

function showBootError(err, context) {
  const ctx = context ? context + ": " : "";
  const msg = (err && (err.message || String(err))) || "Erro desconhecido";
  const banner = document.createElement("div");
  banner.setAttribute("role", "alert");
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;color:#fff;padding:12px 16px;font-family:sans-serif;font-size:14px;line-height:1.4;box-shadow:0 4px 6px rgba(0,0,0,.2);white-space:pre-wrap;word-break:break-all;";
  banner.textContent = "Erro ao carregar a calculadora: " + ctx + msg + "\n\nVerifique: calculadora.js e compliance.js (HTTP 200, MIME application/javascript). Rede/Console para detalhes.";
  try {
    document.body.appendChild(banner);
  } catch (_) {
    document.documentElement.appendChild(banner);
  }
  if (typeof console !== "undefined" && console.error) console.error(context || "Boot", err);
}

function debugSoftFallback(context, err) {
  if (typeof console !== "undefined" && typeof console.debug === "function") {
    const message = err && (err.message || String(err)) ? (err.message || String(err)) : "erro desconhecido";
    console.debug("[soft-fallback]", context, message);
  }
}

function tuneHeroSignalSpacing() {
  const signals = document.querySelector(".hero-signal-inline");
  if (signals) {
    signals.style.setProperty("margin-top", "2.65rem", "important");
  }
  const trustLine = document.querySelector(".hero-trust-line");
  if (trustLine) {
    trustLine.style.setProperty("margin-top", "0.95rem");
  }
}
(async function bootstrap() {
    tuneHeroSignalSpacing();
    try {
      const calcMod = await import("./calculadora.js");
      compute = calcMod.compute;
    } catch (e) {
      showBootError(e, "Falha ao carregar calculadora.js");
      return;
    }
    try {
      const compMod = await import("./compliance.js");
      hasAcceptedTerms = compMod.hasAcceptedTerms;
      recordAcceptance = compMod.recordAcceptance;
      getSessionId = compMod.getSessionId;
      textChecksum = compMod.textChecksum;
      TERMS_VERSION = compMod.TERMS_VERSION;
      appendAuditSnapshot = compMod.appendAuditSnapshot;
      LEGAL_DISCLAIMER = compMod.LEGAL_DISCLAIMER;
      getAuditTrail = compMod.getAuditTrail;
    } catch (e) {
      showBootError(e, "Falha ao carregar compliance.js");
      return;
    }
    try {
      const benchmarkMod = await import("./benchmarking.js");
      evaluateBenchmarkAlerts = benchmarkMod.evaluateBenchmarkAlerts;
    } catch (_) {
      debugSoftFallback("Falha ao carregar benchmarking.js", _);
      evaluateBenchmarkAlerts = () => [];
    }
    try {
      const advancedMod = await import("./advanced-pricing.js");
      computeAdvancedPricing = advancedMod.computeAdvancedPricing;
      deriveHistoricalVarianceSamples = advancedMod.deriveHistoricalVarianceSamples;
      computeAgencyEquivalent = advancedMod.computeAgencyEquivalent;
    } catch (_) {
      debugSoftFallback("Falha ao carregar advanced-pricing.js", _);
      computeAdvancedPricing = null;
      deriveHistoricalVarianceSamples = () => [];
      computeAgencyEquivalent = null;
    }
    try {
      const pricingEngineV1Mod = await import("./src/domain/pricing/engine-v1.js");
      computePricingEngineV1 = pricingEngineV1Mod.computePricingEngineV1;
    } catch (_) {
      debugSoftFallback("Falha ao carregar src/domain/pricing/engine-v1.js", _);
      computePricingEngineV1 = null;
    }
    try {
      const riskMod = await import("./risk-audit.js");
      computeRiskScore = riskMod.computeRiskScore;
      riskNarrative = riskMod.riskNarrative;
    } catch (_) {
      debugSoftFallback("Falha ao carregar risk-audit.js", _);
      computeRiskScore = () => ({ score: 0, subscores: { riscoEscopo: 0, ocupacaoPressao: 0, exaustaoPressao: 0, margemFragilidade: 0 } });
      riskNarrative = () => "Sem dados para auditoria de risco.";
    }
    try {
      const telemetryMod = await import("./telemetry.js");
      trackEvent = telemetryMod.trackEvent;
    } catch (_) {
      debugSoftFallback("Falha ao carregar telemetry.js", _);
      trackEvent = () => null;
    }
    try {
      const negotiationMod = await import("./negotiation-v21.js");
      computeScopeShielding = negotiationMod.computeScopeShielding;
      computeDynamicScarcityMarkup = negotiationMod.computeDynamicScarcityMarkup;
      computeRunwaySummary = negotiationMod.computeRunwaySummary;
      computeRoiAnchor = negotiationMod.computeRoiAnchor;
      generateJustificationBlocks = negotiationMod.generateJustificationBlocks;
    } catch (_) {
      debugSoftFallback("Falha ao carregar negotiation-v21.js", _);
      computeScopeShielding = () => ({ score: 0, level: "low", markupPct: 0, capPct: 18 });
      computeDynamicScarcityMarkup = () => ({ ocupacaoAgenda: 0, markupPct: 0, capPct: 30 });
      computeRunwaySummary = () => ({
        reservaMetaMeses: 6,
        custoPessoalMensal: 0,
        custoFonte: "derivado",
        metaReserva: 0,
        runwayMesesAtual: 0,
        runwayDiasAtual: 0,
        runwayMesesPosProjeto: 0,
        runwayDiasPosProjeto: 0,
        projetosNecessarios: null,
        caveat: "Estimativa sujeita Ã  execuÃ§Ã£o e variÃ¡veis operacionais.",
      });
      computeRoiAnchor = () => ({ enabled: false, text: "", caveat: "Estimativa sujeita Ã  execuÃ§Ã£o e variÃ¡veis operacionais." });
      generateJustificationBlocks = () => ({
        resumoExecutivo: "",
        justificativaTecnica: "",
        justificativaPrioridadeRisco: "",
        caveat: "Estimativa sujeita Ã  execuÃ§Ã£o e variÃ¡veis operacionais.",
      });
    }
    try {
      const strategistMod = await import("./strategist-mode.js");
      computeStrategistMetrics = strategistMod.computeStrategistMetrics;
      formatStrategistValue = strategistMod.formatStrategistValue;
      STRATEGIST_CAVEAT = strategistMod.STRATEGIST_CAVEAT;
    } catch (_) {
      debugSoftFallback("Falha ao carregar strategist-mode.js", _);
      computeStrategistMetrics = () => ({ ok: false, vce: null, roix: null, cdo: null, vceLabel: null, viabilidadeAlerta: false });
      formatStrategistValue = () => "—";
      STRATEGIST_CAVEAT = "Estimativa baseada nas premissas informadas; sem garantias.";
    }
    try {
      const hardeningMod = await import("./hardening-v21.js");
      validateEndpointUrl = hardeningMod.validateEndpointUrl;
      shouldTrackRiskScoreView = hardeningMod.shouldTrackRiskScoreView;
      buildCompositionPartsModel = hardeningMod.buildCompositionParts;
      ensurePdfYSpaceModel = hardeningMod.ensurePdfYSpace;
      advancePdfYModel = hardeningMod.advancePdfY;
      advancePdfYByLinesModel = hardeningMod.advancePdfYByLines;
    } catch (_) {
      debugSoftFallback("Falha ao carregar hardening-v21.js", _);
      validateEndpointUrl = () => ({ ok: false, reason: "INVALID_URL" });
      shouldTrackRiskScoreView = () => ({ shouldTrack: true, next: null });
      buildCompositionPartsModel = (s, r) => {
        if (!(r && r.ok) || !Number.isFinite(r.revenueTarget) || r.revenueTarget <= 0) return [];
        const income = Math.max(0, Number(s?.targetIncome) || 0);
        const costs = Math.max(0, Number(s?.monthlyCosts) || 0);
        const core = Math.max(0, Number(r.revenueTarget) - income - costs);
        const base = [
          { key: "income", label: "Renda lÃ­quida desejada", value: income, color: "#34d399" },
          { key: "costs", label: "Custos fixos", value: costs, color: "#60a5fa" },
          { key: "core", label: "Encargos e margem essenciais", value: core, color: "#a78bfa" },
        ];
        const total = base.reduce((acc, p) => acc + p.value, 0) || 1;
        return base.map((p) => ({ ...p, percent: (p.value / total) * 100 }));
      };
      ensurePdfYSpaceModel = (y) => ({ y: Number.isFinite(y) ? y : 56, addPage: false });
      advancePdfYModel = (y, step) => (Number(y) || 0) + (Number(step) || 0);
      advancePdfYByLinesModel = (y, lines, lineHeight, spacing) => {
        const l = Math.max(0, Number(lines) || 0);
        const h = Math.max(0, Number(lineHeight) || 0);
        const s = Math.max(0, Number(spacing) || 0);
        return (Number(y) || 0) + (l * h) + s;
      };
    }

    const BRAND_NAME = "Calculadora de PrecificaÃ§Ã£o para Freelancers";
    const BRAND_SUBTITLE = "Calculadora de PrecificaÃ§Ã£o para Freelancers";
    const BRAND_TAGLINE = "PrecificaÃ§Ã£o profissional em minutos";
    const BRAND_HERO_HEADLINE = "PrecificaÃ§Ã£o estratÃ©gica para quem entrega valor, nÃ£o horas.";
    const BRAND_SUBHEADLINE = "Calcule taxas sustentÃ¡veis, justifique propostas com respaldo tÃ©cnico e negocie com clareza em uma Ãºnica ferramenta.";
    const NEGOTIATION_PHRASES = [
      "Este investimento considera escopo, prazo e nÃ­vel de responsabilidade acordados.",
      "A proposta jÃ¡ contempla margem tÃ©cnica para gestÃ£o de expectativa e execuÃ§Ã£o consistente.",
      "A reserva de agenda foi considerada para viabilizar o prazo combinado.",
      "O valor estÃ¡ alinhado Ã s premissas operacionais apresentadas neste documento.",
      "ReduÃ§Ã£o de preÃ§o implica revisÃ£o proporcional de escopo, prazo ou formato de entrega.",
      "A composiÃ§Ã£o apresentada prioriza previsibilidade de entrega e qualidade tÃ©cnica.",
      "As condiÃ§Ãµes propostas preservam a sustentabilidade da operaÃ§Ã£o durante o projeto.",
      "A decisÃ£o de investimento deve considerar impacto esperado, risco e premissas explÃ­citas.",
    ];

    const { STORAGE_KEY, LEGACY_STORAGE_KEY, SCENARIOS_KEY, INTEGRATIONS_KEY, DISMISSED_ALERTS_KEY } = STORAGE_KEYS;
    const STORAGE_SCHEMA_VERSION = 2;
    const AUDIT_DEBOUNCE_MS = 800;
    const FEATURE_FLAGS = resolveFeatureFlags();
    ensureMotionFoundationStyles();
    let currentUiMode = "essencial";
    let activateUiModeTab = null;
    let resolveUiModeTabIndex = null;
    let logoDataUrl = null;
    let calcCardStash = null;
    let lastAuditSnapshotStr = "";
    let auditDebounceTimer = null;
    let deferredInstallPrompt = null;
    let riskTelemetryState = null;
    let proposalJustificationPinned = false;
    const counterAnimationState = new WeakMap();
    let riskThermometerRefs = null;
    let latestPricingEngineV1Vm = null;
    let traceabilityUiState = { activeMetric: null, activeInputKeys: [] };
    let traceabilityListenersBound = false;

    const TRACEABILITY_METRIC_TAGS = Object.freeze({
      heroPrice: "drives price",
      sustainablePrice: "price pressure",
      floorPrice: "cost floor",
      riskIndicator: "raises risk",
    });

    const $ = (id) => document.getElementById(id);

    const els = {
      currency: $("currency"),
      targetIncome: $("targetIncome"),
      monthlyCosts: $("monthlyCosts"),
      taxRate: $("taxRate"),
      profitMargin: $("profitMargin"),
      buffer: $("buffer"),
      utilization: $("utilization"),
      hoursPerDay: $("hoursPerDay"),
      daysPerWeek: $("daysPerWeek"),
      vacationWeeks: $("vacationWeeks"),

      professionalName: $("professionalName"),
      clientName: $("clientName"),
      validityDate: $("validityDate"),

      projectHours: $("projectHours"),
      scopeRisk: $("scopeRisk"),
      discount: $("discount"),
      scopeClarity: $("scopeClarity"),
      urgentDeadline: $("urgentDeadline"),
      revisionLoad: $("revisionLoad"),
      engagementModel: $("engagementModel"),
      monthlyVolumeHours: $("monthlyVolumeHours"),
      monthlyVolumeHoursWrap: $("monthlyVolumeHoursWrap"),

      hourlyRate: $("hourlyRate"),
      dailyRate: $("dailyRate"),
      billableHours: $("billableHours"),
      revenueTarget: $("revenueTarget"),
      revenueBreakdown: $("revenueBreakdown"),
      pricingEngineV1Card: $("pricingEngineV1Card"),
      pricingEngineV1Status: $("pricingEngineV1Status"),
      pricingBandPiso: $("pricingBandPiso"),
      pricingBandSustentavel: $("pricingBandSustentavel"),
      pricingBandIdeal: $("pricingBandIdeal"),
      pricingRateHora: $("pricingRateHora"),
      pricingRateDia: $("pricingRateDia"),
      pricingEconomicsFaturamentoAlvo: $("pricingEconomicsFaturamentoAlvo"),
      pricingEconomicsHorasFaturaveisMes: $("pricingEconomicsHorasFaturaveisMes"),
      pricingEconomicsOcupacaoReal: $("pricingEconomicsOcupacaoReal"),
      pricingProjectTotal: $("pricingProjectTotal"),
      pricingProjectHours: $("pricingProjectHours"),
      pricingProjectDiscountImpact: $("pricingProjectDiscountImpact"),
      pricingGuardrailsList: $("pricingGuardrailsList"),
      pricingExplainFactorsList: $("pricingExplainFactorsList"),
      stepCost: $("stepCost"),
      stepTax: $("stepTax"),
      stepProfit: $("stepProfit"),
      stepHours: $("stepHours"),

      projectPrice: $("projectPrice"),
      projectHint: $("projectHint"),
      proposalText: $("proposalText"),
      dailyLabel: $("dailyLabel"),
      antiDiscountList: $("antiDiscountList"),

      btnCopyHourly: $("btnCopyHourly"),
      btnCopyProject: $("btnCopyProject"),
      btnCopyProposal: $("btnCopyProposal"),
      btnPdf: $("btnPdf"),
      btnPdfProposal: $("btnPdfProposal"),
      btnPrimaryPdfHeader: $("btnPrimaryPdfHeader"),
      btnPrimaryPdfHeaderWrap: $("btnPrimaryPdfHeaderWrap"),
      pdfInternalFormat: $("pdfInternalFormat"),
      pdfInternalFormatWrap: $("pdfInternalFormatWrap"),
      btnShare: $("btnShare"),
      shareIncludeNames: $("shareIncludeNames"),
      btnExportConfig: $("btnExportConfig"),
      btnReset: $("btnReset"),
      btnToolsToggle: $("btnToolsToggle"),
      toolsDropdown: $("toolsDropdown"),
      toolsBackdrop: $("toolsBackdrop"),
      toolsClose: $("toolsClose"),
      toolsReset: $("toolsReset"),
      toolsExport: $("toolsExport"),
      toolsImport: $("toolsImport"),
      toolsInstall: $("toolsInstall"),
      btnRemoveLogo: $("btnRemoveLogo"),
      logoStateText: $("logoStateText"),
      advancedModeWrap: $("advancedModeWrap"),
      advancedModeLabel: $("advancedModeLabel"),
      activeModeLabel: $("activeModeLabel"),
      premiumLockModal: $("premiumLockModal"),
      premiumPreviewOverlay: $("premiumPreviewOverlay"),
      btnPremiumLista: $("btnPremiumLista"),
      btnPremiumQuero: $("btnPremiumQuero"),
      btnPremiumClose: $("btnPremiumClose"),
      btnPremiumOffer: $("btnPremiumOffer"),
      btnPremiumVerPrevia: $("btnPremiumVerPrevia"),
      btnPremiumVoltar: $("btnPremiumVoltar"),
      advancedMode: $("advancedMode"),
      advancedConfigCard: $("advancedConfigCard"),
      advancedTeaserCard: $("advancedTeaserCard"),
      enableMonteCarlo: $("enableMonteCarlo"),
      assetValue: $("assetValue"),
      assetUsefulLifeMonths: $("assetUsefulLifeMonths"),
      opportunityRateAnnual: $("opportunityRateAnnual"),
      occupancyRate: $("occupancyRate"),
      weeklyHours: $("weeklyHours"),
      scopeVolatility: $("scopeVolatility"),
      complexidadeProjeto: $("complexidadeProjeto"),
      prazoEntrega: $("prazoEntrega"),
      criticidadeNegocio: $("criticidadeNegocio"),
      envolvimentoCliente: $("envolvimentoCliente"),
      impactoNoNegocio: $("impactoNoNegocio"),
      areaImpacto: $("areaImpacto"),
      ocupacaoAgenda: $("ocupacaoAgenda"),
      riskHistoricoAlteracoes: $("riskHistoricoAlteracoes"),
      riskComunicacaoFragmentada: $("riskComunicacaoFragmentada"),
      riskTomadorIndefinido: $("riskTomadorIndefinido"),
      riskEscopoIncompleto: $("riskEscopoIncompleto"),
      riskUrgenciaSemBriefing: $("riskUrgenciaSemBriefing"),
      modoEstrategista: $("modoEstrategista"),
      valorGanhoEstimado12m: $("valorGanhoEstimado12m"),
      custoOportunidadeMensal: $("custoOportunidadeMensal"),
      strategistCard: $("strategistCard"),
      strategistInputsWrap: $("strategistInputsWrap"),
      strategistVce: $("strategistVce"),
      strategistVceLabel: $("strategistVceLabel"),
      strategistRoix: $("strategistRoix"),
      strategistCdo: $("strategistCdo"),
      strategistCustoInacao: $("strategistCustoInacao"),
      strategistViabilidadeAlerta: $("strategistViabilidadeAlerta"),
      strategistResultsCard: $("strategistResultsCard"),
      reservaMetaMeses: $("reservaMetaMeses"),
      reservaAtual: $("reservaAtual"),
      custoPessoalMensal: $("custoPessoalMensal"),

      proposalMode: $("proposalMode"),
      configWrapper: $("configWrapper"),
      wizardContainer: $("wizardContainer"),
      wizardStep1: $("wizardStep1"),
      wizardStep2: $("wizardStep2"),
      wizardStep3: $("wizardStep3"),
      wizardStepIndicator: $("wizardStepIndicator"),
      wizardNav: $("wizardNav"),
      btnWizardPrev: $("btnWizardPrev"),
      btnWizardNext: $("btnWizardNext"),
      btnWizardAdvanced: $("btnWizardAdvanced"),
      wizardBottomBar: $("wizardBottomBar"),
      wizardBottomBarValue: $("wizardBottomBarValue"),
      mobileA11yBar: $("mobileA11yBar"),
      mobileA11yBarValue: $("mobileA11yBarValue"),
      btnMobileA11yPdf: $("btnMobileA11yPdf"),
      btnWizardBottomPdf: $("btnWizardBottomPdf"),
      calcCard: $("calcCard"),
      logoInput: $("logoInput"),
      resultCardsInternal: $("resultCardsInternal"),
      resultCardProposal: $("resultCardProposal"),
      resultProposalTotal: $("resultProposalTotal"),
      resultProposalPrazo: $("resultProposalPrazo"),
      resultProposalValorGanho: $("resultProposalValorGanho"),
      proposalValorGanhoBlock: $("proposalValorGanhoBlock"),
      resultCardsCtaBlock: $("resultCardsCtaBlock"),
      btnPdfFromPreview: $("btnPdfFromPreview"),
      trustBadgesBlock: $("trustBadgesBlock"),
      compositionChart: $("compositionChart"),
      compositionLegend: $("compositionLegend"),
      alertsList: $("alertsList"),
      agencyEquivalentBlock: $("agencyEquivalentBlock"),
      agencyTotalLabel: $("agencyTotalLabel"),
      agencySavingsBadge: $("agencySavingsBadge"),
      explainabilityCard: $("explainabilityCard"),
      explainabilityList: $("explainabilityList"),
      advancedWarnings: $("advancedWarnings"),
      advancedModelLabel: $("advancedModelLabel"),
      auditModeCard: $("auditModeCard"),
      riskScoreValue: $("riskScoreValue"),
      riskScoreNarrative: $("riskScoreNarrative"),
      riskScoreBreakdown: $("riskScoreBreakdown"),
      exhaustionBadgeLabel: $("exhaustionBadgeLabel"),
      exhaustionBadgeImpact: $("exhaustionBadgeImpact"),
      premiumModeTag: $("premiumModeTag"),
      negotiationOutputCard: $("negotiationOutputCard"),
      roiAnchorLine: $("roiAnchorLine"),
      justificationExecutive: $("justificationExecutive"),
      justificationTechnical: $("justificationTechnical"),
      justificationPriorityWrap: $("justificationPriorityWrap"),
      justificationPriority: $("justificationPriority"),
      scopeShieldSummary: $("scopeShieldSummary"),
      scarcitySummary: $("scarcitySummary"),
      runwaySummary: $("runwaySummary"),
      batnaMeterBlock: $("batnaMeterBlock"),
      batnaLevelBadge: $("batnaLevelBadge"),
      batnaMessage: $("batnaMessage"),
      btnCopyJustification: $("btnCopyJustification"),
      btnInsertProposalJustification: $("btnInsertProposalJustification"),
      trustMicrocopyList: $("trustMicrocopyList"),
      btnImportConfig: $("btnImportConfig"),
      importConfigInput: $("importConfigInput"),
      resultError: $("resultError"),
      btnInstallApp: $("btnInstallApp"),
      btnSaveScenarioA: $("btnSaveScenarioA"),
      btnSaveScenarioB: $("btnSaveScenarioB"),
      btnClearScenarios: $("btnClearScenarios"),
      btnLoadScenarioA: $("btnLoadScenarioA"),
      btnLoadScenarioB: $("btnLoadScenarioB"),
      scenarioAContent: $("scenarioAContent"),
      scenarioBContent: $("scenarioBContent"),
      scenarioDelta: $("scenarioDelta"),
      btnExportCsv: $("btnExportCsv"),
      btnCopyTsv: $("btnCopyTsv"),
      btnSendSheets: $("btnSendSheets"),
      btnSendNotion: $("btnSendNotion"),
      btnOpenIntegrationSettings: $("btnOpenIntegrationSettings"),
      integrationSettingsModal: $("integrationSettingsModal"),
      btnCloseIntegrationSettings: $("btnCloseIntegrationSettings"),
      btnSaveIntegrationSettings: $("btnSaveIntegrationSettings"),
      sheetsEndpointInput: $("sheetsEndpointInput"),
      notionEndpointInput: $("notionEndpointInput"),

      toast: $("toast"),
      termsModal: $("termsModal"),
      termsScroll: $("termsScroll"),
      btnAcceptTerms: $("btnAcceptTerms"),
    };

    function downloadJson(filename, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    const WEBHOOK_CALCULADORA_URL = "https://n8n-dev-calculadora.app.n8n.cloud";

    async function sendCalculadoraToWebhook(dados) {
      console.log("Tentando enviar para o n8n...");
      try {
        const res = await fetch(WEBHOOK_CALCULADORA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });
        const data = await res.json().catch(() => res.text());
        console.log("Webhook calculadora â€“ resposta:", data);
        return data;
      } catch (err) {
        console.error("Erro ao enviar para webhook calculadora:", err);
        return null;
      }
    }

    function exportConfig() {
      if (!hasAcceptedTerms()) {
        showToast("Para exportar, aceite os termos no inÃ­cio da pÃ¡gina.");
        return;
      }
      const s = getStateFromInputs();
      const safeData = sanitizeState(defaultState(), s);
      delete safeData.professionalName;
      delete safeData.clientName;
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        schemaVersion: 1,
        data: safeData,
        hasLogo: !!logoDataUrl,
        logoDataUrl: logoDataUrl || null
      };
      downloadJson("configuracoes_calculadora_backup.txt", payload);
      showToast("ConfiguraÃ§Ãµes exportadas.");
    }

    function importConfig() {
      const input = els.importConfigInput;
      if (!input) return;
      input.value = "";
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const raw = typeof reader.result === "string" ? reader.result : "";
            const payload = JSON.parse(raw);
            const data = payload.data != null ? payload.data : payload;
            const hasTopLogoField = Object.prototype.hasOwnProperty.call(payload, "logoDataUrl");
            const hasDataLogoField = data && Object.prototype.hasOwnProperty.call(data, "logoDataUrl");
            const hasLogoField = hasTopLogoField || hasDataLogoField;

            const logoFromPayload =
              typeof payload?.logoDataUrl === "string"
                ? payload.logoDataUrl
                : (typeof data?.logoDataUrl === "string" ? data.logoDataUrl : null);
            delete data.logoDataUrl;
            setInputsFromState(sanitizeState(defaultState(), { ...defaultState(), ...data }));

            let logoIgnored = false;
            if (logoFromPayload && logoFromPayload.startsWith("data:image/")) {
              if (logoFromPayload.length > LOGO_IMPORT_MAX_CHARS) {
                logoIgnored = true;
                logoDataUrl = null;
              } else {
                const normalized = await normalizeLogoDataUrl(logoFromPayload);
                if (normalized) {
                  logoDataUrl = normalized;
                } else {
                  logoIgnored = true;
                  logoDataUrl = null;
                }
              }
            } else if (logoFromPayload != null) {
              logoIgnored = true;
              logoDataUrl = null;
            }
            if (hasLogoField && !logoFromPayload) {
              logoDataUrl = null;
            }

            updateUI();
            showToast(logoIgnored ? "ConfiguraÃ§Ãµes importadas. Logo ignorada (tamanho ou formato)." : "ConfiguraÃ§Ãµes importadas.");
          } catch (e) {
            showToast("Arquivo invÃ¡lido.");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    function getProposalTextForPdf() {
      const raw = els.proposalText && els.proposalText.textContent ? String(els.proposalText.textContent).trim() : "";
      if (raw === "" || raw === "â€”") return "";
      const sanitized = raw.replace(/\brisco\b/gi, "").replace(/\brisk\b/gi, "").trim();
      return sanitized || raw;
    }

    function clamp(n, min, max) {
      if (Number.isNaN(n)) return min;
      return Math.min(max, Math.max(min, n));
    }

    function toNum(value) {
      const n = Number(String(value ?? "").replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    }

    function sanitizeCurrency(value) {
      const v = (value ?? "").toString().trim().toUpperCase();
      return (v === "BRL" || v === "USD" || v === "EUR") ? v : "BRL";
    }

    function getLocaleForCurrency(curr) {
      const c = sanitizeCurrency(curr);
      if (c === "BRL") return "pt-BR";
      if (c === "EUR") return "pt-PT";
      return "en-US";
    }

    function fmtMoney(amount, curr) {
      const currency = sanitizeCurrency(curr);
      const opts = { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 };
      try {
        const locale = getLocaleForCurrency(currency);
        return new Intl.NumberFormat(locale, opts).format(amount);
      } catch (_) {
        return new Intl.NumberFormat("pt-BR", opts).format(amount);
      }
    }

    function fmtMoneyPdf(amount, curr) {
      const safe = Number.isFinite(amount) ? amount : 0;
      const rounded = Number(safe.toFixed(2));
      return fmtMoney(rounded, curr);
    }

    function fmtNumber(n, digits = 0) {
      return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(n);
    }

    function showToast(message) {
      els.toast.textContent = message;
      els.toast.classList.remove("hidden");
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => els.toast.classList.add("hidden"), 1800);
    }

    function ensureMotionFoundationStyles() {
      if (document.getElementById("uiMotionFoundationStyles")) return;
      const style = document.createElement("style");
      style.id = "uiMotionFoundationStyles";
      style.textContent = `
          @keyframes uiFadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes uiSkeletonShimmer {
            0% { background-position: -220% 0; }
            100% { background-position: 220% 0; }
          }
          .tab-panel-relative { position: relative; }
          .motion-fade-in {
            animation: uiFadeSlideIn .24s cubic-bezier(.22,.9,.28,1);
          }
          #panel-essential.tab-panel-visible .card-macro,
          #panel-scenario.tab-panel-visible #scenarioCard,
          #panel-governance.tab-panel-visible #governanceCard,
          #panel-strategist.tab-panel-visible #strategistCard,
          #panel-strategist.tab-panel-visible #auditModeCard,
          #panel-strategist.tab-panel-visible #negotiationOutputCard,
          #panel-strategist.tab-panel-visible #explainabilityCard {
            animation: uiFadeSlideIn .26s cubic-bezier(.22,.9,.28,1);
          }
          .tab-skeleton-overlay {
            position: absolute;
            inset: .4rem;
            z-index: 4;
            border-radius: .9rem;
            border: 1px solid rgba(148,163,184,.18);
            background: rgba(7,10,18,.42);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            display: grid;
            align-content: center;
            gap: .55rem;
            padding: .9rem;
            opacity: 0;
            pointer-events: none;
            transition: opacity .12s ease-out;
          }
          .tab-skeleton-overlay.is-visible { opacity: 1; }
          .tab-skeleton-overlay.is-hiding { opacity: 0; }
          .tab-skeleton-line {
            height: .62rem;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(148,163,184,.16), rgba(148,163,184,.33), rgba(148,163,184,.16));
            background-size: 220% 100%;
            animation: uiSkeletonShimmer 1.1s linear infinite;
          }
          .tab-skeleton-line.short { width: 56%; }
          .risk-thermo-track {
            height: .55rem;
            width: 100%;
            border-radius: 999px;
            background: rgba(148,163,184,.2);
            overflow: hidden;
          }
          .risk-thermo-fill {
            height: 100%;
            width: 8%;
            border-radius: inherit;
            background: hsl(120 80% 45%);
            transition: width .28s ease-out, background-color .28s ease-out;
          }
          .risk-thermo-label {
            transition: color .28s ease-out;
          }
          ${FEATURE_FLAGS.ui_glassmorphism_boost_enabled ? `
          .card-macro,
          #scenarioCard,
          #governanceCard,
          #auditModeCard,
          #negotiationOutputCard,
          #explainabilityCard {
            backdrop-filter: blur(12px) saturate(130%);
            -webkit-backdrop-filter: blur(12px) saturate(130%);
          }
          input:focus-visible,
          select:focus-visible,
          textarea:focus-visible {
            box-shadow: 0 0 0 1.5px rgba(45,212,191,.58), 0 0 0 6px rgba(45,212,191,.14), 0 10px 24px rgba(16,185,129,.12) !important;
            border-color: rgba(45,212,191,.64) !important;
          }
          ` : ""}
        `;
      document.head.appendChild(style);
    }

    function showTabSkeleton(panel) {
      if (!FEATURE_FLAGS.ui_skeleton_tabs_enabled || !panel) return;
      panel.querySelectorAll(".tab-skeleton-overlay").forEach((n) => n.remove());
      const overlay = document.createElement("div");
      overlay.className = "tab-skeleton-overlay";
      const lineA = document.createElement("span");
      lineA.className = "tab-skeleton-line";
      const lineB = document.createElement("span");
      lineB.className = "tab-skeleton-line short";
      overlay.append(lineA, lineB);
      panel.classList.add("tab-panel-relative");
      panel.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("is-visible"));
      window.setTimeout(() => {
        overlay.classList.add("is-hiding");
        window.setTimeout(() => overlay.remove(), 140);
      }, 190);
    }

    function animatePanelEntrance(panel) {
      if (!FEATURE_FLAGS.ui_panel_fade_enabled || !panel) return;
      panel.classList.remove("motion-fade-in");
      void panel.offsetWidth;
      panel.classList.add("motion-fade-in");
    }

    function animateMoneyCounter(node, targetValue, currency) {
      if (!node) return;
      if (!FEATURE_FLAGS.ui_counter_up_enabled || !Number.isFinite(targetValue)) {
        safeMoney(node, Number.isFinite(targetValue) ? fmtMoney(targetValue, currency) : "â€”");
        counterAnimationState.delete(node);
        return;
      }
      const prev = counterAnimationState.get(node);
      if (prev && prev.raf) cancelAnimationFrame(prev.raf);
      const from = prev && Number.isFinite(prev.current) ? prev.current : targetValue;
      const to = Number(targetValue);
      if (Math.abs(to - from) < 0.01) {
        safeMoney(node, fmtMoney(to, currency));
        counterAnimationState.set(node, { current: to, raf: null });
        return;
      }
      const start = performance.now();
      const duration = 560;
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const value = from + (to - from) * easeOut(progress);
        safeMoney(node, fmtMoney(value, currency));
        if (progress < 1) {
          const raf = requestAnimationFrame(tick);
          counterAnimationState.set(node, { current: value, raf });
        } else {
          counterAnimationState.set(node, { current: to, raf: null });
        }
      };
      const raf = requestAnimationFrame(tick);
      counterAnimationState.set(node, { current: from, raf });
    }

    function ensureRiskThermometer() {
      if (!FEATURE_FLAGS.ui_risk_thermometer_enabled || riskThermometerRefs) return;
      const firstRisk = els.riskHistoricoAlteracoes;
      if (!firstRisk) return;
      const host = firstRisk.closest(".rounded-xl");
      if (!host) return;

      const wrap = document.createElement("div");
      wrap.id = "riskThermometerWrap";
      wrap.className = "mt-3 space-y-1";
      const header = document.createElement("div");
      header.className = "flex items-center justify-between text-[11px] text-slate-300";

      const title = document.createElement("span");
      title.textContent = "Termometro de risco";

      const label = document.createElement("span");
      label.id = "riskThermometerLabel";
      label.className = "risk-thermo-label text-emerald-300";
      label.textContent = "Baixo (0/5)";

      header.append(title, label);

      const track = document.createElement("div");
      track.className = "risk-thermo-track";

      const fill = document.createElement("div");
      fill.id = "riskThermometerFill";
      fill.className = "risk-thermo-fill";
      track.appendChild(fill);

      wrap.append(header, track);
      host.appendChild(wrap);

      riskThermometerRefs = { label, fill };
    }

    function updateRiskThermometer(state) {
      if (!FEATURE_FLAGS.ui_risk_thermometer_enabled) return;
      ensureRiskThermometer();
      if (!riskThermometerRefs || !state) return;
      const checks = [
        !!state.riskHistoricoAlteracoes,
        !!state.riskComunicacaoFragmentada,
        !!state.riskTomadorIndefinido,
        !!state.riskEscopoIncompleto,
        !!state.riskUrgenciaSemBriefing,
      ];
      const count = checks.filter(Boolean).length;
      const ratio = count / checks.length;
      const hue = 120 - Math.round(120 * ratio);
      const width = Math.max(8, Math.round(ratio * 100));
      const levels = ["Baixo", "Leve", "Moderado", "Alto", "Crítico", "Crítico"];
      const level = levels[Math.min(levels.length - 1, count)] || "Baixo";
      riskThermometerRefs.fill.style.width = `${width}%`;
      riskThermometerRefs.fill.style.backgroundColor = `hsl(${hue} 82% 48%)`;
      riskThermometerRefs.label.textContent = `${level} (${count}/5)`;
      riskThermometerRefs.label.style.color = `hsl(${hue} 80% 68%)`;
    }

    function normalizeCopyToastMessage(okMsg) {
      if (!okMsg) return "Copiado para a Ã¡rea de transferÃªncia! ðŸŽ‰";
      return /copiad|copiar/i.test(okMsg)
        ? "Copiado para a Ã¡rea de transferÃªncia! ðŸŽ‰"
        : okMsg;
    }

    function getStateFromInputs() {
      return {
        currency: sanitizeCurrency(els.currency && els.currency.value),
        targetIncome: toNum(els.targetIncome && els.targetIncome.value),
        monthlyCosts: toNum(els.monthlyCosts && els.monthlyCosts.value),
        taxRate: clamp(toNum(els.taxRate && els.taxRate.value), 0, 70),
        profitMargin: clamp(toNum(els.profitMargin && els.profitMargin.value), 0, 200),
        buffer: clamp(toNum(els.buffer && els.buffer.value), 0, 100),
        utilization: clamp(toNum(els.utilization && els.utilization.value), 10, 100),
        hoursPerDay: clamp(toNum(els.hoursPerDay && els.hoursPerDay.value), 1, 16),
        daysPerWeek: clamp(toNum(els.daysPerWeek && els.daysPerWeek.value), 1, 7),
        vacationWeeks: clamp(toNum(els.vacationWeeks && els.vacationWeeks.value), 0, 20),
        professionalName: ((els.professionalName && els.professionalName.value) || "").trim(),
        clientName: ((els.clientName && els.clientName.value) || "").trim(),
        validityDate: (els.validityDate && els.validityDate.value) || "",
        proposalMode: !!(els.proposalMode && els.proposalMode.checked),
        pdfInternalFormat: (els.pdfInternalFormat && els.pdfInternalFormat.value) || "complete",
        advancedMode: !!(els.advancedMode && els.advancedMode.checked),
        enableMonteCarlo: !!(els.enableMonteCarlo && els.enableMonteCarlo.checked),
        projectHours: clamp(toNum(els.projectHours && els.projectHours.value), 0, 100000),
        scopeRisk: clamp(toNum(els.scopeRisk && els.scopeRisk.value), 0, 100),
        discount: clamp(toNum(els.discount && els.discount.value), 0, 90),
        assetValue: clamp(toNum(els.assetValue && els.assetValue.value), 0, 1e12),
        assetUsefulLifeMonths: clamp(toNum(els.assetUsefulLifeMonths && els.assetUsefulLifeMonths.value), 1, 1200),
        opportunityRateAnnual: clamp(toNum(els.opportunityRateAnnual && els.opportunityRateAnnual.value), 0, 300),
        occupancyRate: clamp(toNum(els.occupancyRate && els.occupancyRate.value), 0, 100),
        weeklyHours: clamp(toNum(els.weeklyHours && els.weeklyHours.value), 1, 120),
        scopeVolatility: (((els.scopeVolatility && els.scopeVolatility.value) || "medium").toLowerCase()),
        complexidadeProjeto: (((els.complexidadeProjeto && els.complexidadeProjeto.value) || "media").toLowerCase()),
        prazoEntrega: (((els.prazoEntrega && els.prazoEntrega.value) || "normal").toLowerCase()),
        criticidadeNegocio: (((els.criticidadeNegocio && els.criticidadeNegocio.value) || "media").toLowerCase()),
        envolvimentoCliente: (((els.envolvimentoCliente && els.envolvimentoCliente.value) || "medio").toLowerCase()),
        impactoNoNegocio: (((els.impactoNoNegocio && els.impactoNoNegocio.value) || "medio").toLowerCase()),
        areaImpacto: ((els.areaImpacto && els.areaImpacto.value) || "").trim(),
        ocupacaoAgenda: clamp(toNum(els.ocupacaoAgenda && els.ocupacaoAgenda.value), 0, 100),
        riskHistoricoAlteracoes: !!(els.riskHistoricoAlteracoes && els.riskHistoricoAlteracoes.checked),
        riskComunicacaoFragmentada: !!(els.riskComunicacaoFragmentada && els.riskComunicacaoFragmentada.checked),
        riskTomadorIndefinido: !!(els.riskTomadorIndefinido && els.riskTomadorIndefinido.checked),
        riskEscopoIncompleto: !!(els.riskEscopoIncompleto && els.riskEscopoIncompleto.checked),
        riskUrgenciaSemBriefing: !!(els.riskUrgenciaSemBriefing && els.riskUrgenciaSemBriefing.checked),
        reservaMetaMeses: clamp(toNum(els.reservaMetaMeses && els.reservaMetaMeses.value), 1, 60),
        reservaAtual: Math.max(0, toNum(els.reservaAtual && els.reservaAtual.value)),
        custoPessoalMensal: Math.max(0, toNum(els.custoPessoalMensal && els.custoPessoalMensal.value)),
        modoEstrategista: !!(els.modoEstrategista && els.modoEstrategista.checked),
        valorGanhoEstimado12m: Math.max(0, toNum(els.valorGanhoEstimado12m && els.valorGanhoEstimado12m.value)),
        custoOportunidadeMensal: Math.max(0, toNum(els.custoOportunidadeMensal && els.custoOportunidadeMensal.value)),
        uiMode: normalizeUiMode(currentUiMode),
      };
    }

    function getCanonicalUiMode(mode) {
      const normalized = normalizeUiMode(mode);
      if (!FEATURE_FLAGS.strategist_mode_enabled && normalized === "estrategista") return "essencial";
      return normalized;
    }

    function setInputsFromState(s) {
      if (els.currency) els.currency.value = sanitizeCurrency(s.currency ?? "BRL");
      if (els.targetIncome) els.targetIncome.value = s.targetIncome ?? 9000;
      if (els.monthlyCosts) els.monthlyCosts.value = s.monthlyCosts ?? 1200;
      if (els.taxRate) els.taxRate.value = s.taxRate ?? 12;
      if (els.profitMargin) els.profitMargin.value = s.profitMargin ?? 15;
      if (els.buffer) els.buffer.value = s.buffer ?? 10;
      if (els.utilization) els.utilization.value = s.utilization ?? 60;
      if (els.hoursPerDay) els.hoursPerDay.value = s.hoursPerDay ?? 6;
      if (els.daysPerWeek) els.daysPerWeek.value = s.daysPerWeek ?? 5;
      if (els.vacationWeeks) els.vacationWeeks.value = s.vacationWeeks ?? 4;
      if (els.professionalName) els.professionalName.value = s.professionalName ?? "";
      if (els.clientName) els.clientName.value = s.clientName ?? "";
      if (els.validityDate) els.validityDate.value = s.validityDate ?? "";
      if (els.proposalMode) els.proposalMode.checked = !!s.proposalMode;
      if (els.pdfInternalFormat) els.pdfInternalFormat.value = (s.pdfInternalFormat === "compact" ? "compact" : "complete");
      if (els.advancedMode) els.advancedMode.checked = !!s.advancedMode;
      if (els.enableMonteCarlo) els.enableMonteCarlo.checked = !!s.enableMonteCarlo;
      if (typeof s.logoDataUrl === "string" && s.logoDataUrl.startsWith("data:image/")) logoDataUrl = s.logoDataUrl;
      if (els.projectHours) els.projectHours.value = s.projectHours ?? 30;
      if (els.scopeRisk) els.scopeRisk.value = s.scopeRisk ?? 15;
      if (els.discount) els.discount.value = s.discount ?? 0;
      if (els.scopeClarity && !["clear", "partial", "unclear"].includes(((els.scopeClarity.value) || "").toLowerCase())) els.scopeClarity.value = "clear";
      if (els.urgentDeadline) els.urgentDeadline.checked = false;
      if (els.revisionLoad && !["low", "medium", "high"].includes(((els.revisionLoad.value) || "").toLowerCase())) els.revisionLoad.value = "low";
      if (els.engagementModel && !["project", "retainer"].includes(((els.engagementModel.value) || "").toLowerCase())) els.engagementModel.value = "project";
      if (els.monthlyVolumeHours && !(Number(els.monthlyVolumeHours.value) >= 0)) els.monthlyVolumeHours.value = 0;
      if (els.assetValue) els.assetValue.value = s.assetValue ?? 0;
      if (els.assetUsefulLifeMonths) els.assetUsefulLifeMonths.value = s.assetUsefulLifeMonths ?? 48;
      if (els.opportunityRateAnnual) els.opportunityRateAnnual.value = s.opportunityRateAnnual ?? 12;
      if (els.occupancyRate) els.occupancyRate.value = s.occupancyRate ?? 70;
      if (els.weeklyHours) els.weeklyHours.value = s.weeklyHours ?? 40;
      if (els.scopeVolatility) els.scopeVolatility.value = ["low", "medium", "high"].includes(s.scopeVolatility) ? s.scopeVolatility : "medium";
      if (els.complexidadeProjeto) els.complexidadeProjeto.value = ["baixa", "media", "alta"].includes(s.complexidadeProjeto) ? s.complexidadeProjeto : "media";
      if (els.prazoEntrega) els.prazoEntrega.value = ["flexivel", "normal", "curto", "urgente"].includes(s.prazoEntrega) ? s.prazoEntrega : "normal";
      if (els.criticidadeNegocio) els.criticidadeNegocio.value = ["baixa", "media", "alta"].includes(s.criticidadeNegocio) ? s.criticidadeNegocio : "media";
      if (els.envolvimentoCliente) els.envolvimentoCliente.value = ["baixo", "medio", "alto"].includes(s.envolvimentoCliente) ? s.envolvimentoCliente : "medio";
      if (els.impactoNoNegocio) els.impactoNoNegocio.value = ["baixo", "medio", "alto", "critico"].includes(s.impactoNoNegocio) ? s.impactoNoNegocio : "medio";
      if (els.areaImpacto) els.areaImpacto.value = s.areaImpacto ?? "";
      if (els.ocupacaoAgenda) els.ocupacaoAgenda.value = s.ocupacaoAgenda ?? 70;
      if (els.modoEstrategista) els.modoEstrategista.checked = !!s.modoEstrategista;
      if (els.valorGanhoEstimado12m) els.valorGanhoEstimado12m.value = s.valorGanhoEstimado12m ?? 0;
      if (els.custoOportunidadeMensal) els.custoOportunidadeMensal.value = s.custoOportunidadeMensal ?? 0;
      if (els.riskHistoricoAlteracoes) els.riskHistoricoAlteracoes.checked = !!s.riskHistoricoAlteracoes;
      if (els.riskComunicacaoFragmentada) els.riskComunicacaoFragmentada.checked = !!s.riskComunicacaoFragmentada;
      if (els.riskTomadorIndefinido) els.riskTomadorIndefinido.checked = !!s.riskTomadorIndefinido;
      if (els.riskEscopoIncompleto) els.riskEscopoIncompleto.checked = !!s.riskEscopoIncompleto;
      if (els.riskUrgenciaSemBriefing) els.riskUrgenciaSemBriefing.checked = !!s.riskUrgenciaSemBriefing;
      if (els.reservaMetaMeses) els.reservaMetaMeses.value = s.reservaMetaMeses ?? 6;
      if (els.reservaAtual) els.reservaAtual.value = s.reservaAtual ?? 0;
      if (els.custoPessoalMensal) els.custoPessoalMensal.value = s.custoPessoalMensal ?? 0;
      const rawMode = s.uiMode != null ? s.uiMode : "essencial";
      currentUiMode = getCanonicalUiMode(rawMode);
    }

    function safeText(node, text) {
      if (!node) return;
      node.textContent = text ?? "";
    }

    function safeMoney(node, text) {
      if (!node) return;
      node.textContent = text ?? "";
    }

    const PRICING_REASON_LABELS = Object.freeze({
      LOW_OCCUPANCY: "Baixa ocupacao",
      HIGH_SCOPE_RISK: "Risco alto de escopo",
      UNCLEAR_SCOPE: "Escopo pouco claro",
      URGENT_DEADLINE: "Prazo urgente",
      HIGH_REVISION_LOAD: "Carga alta de revisoes",
      LOW_MARGIN: "Margem baixa",
      DISCOUNT_BELOW_FLOOR: "Desconto abaixo do piso",
      RETAINER_WITHOUT_VOLUME: "Retainer sem volume minimo",
    });

    const PRICING_GUARDRAIL_LABELS = Object.freeze({
      floorBreached: "Desconto abaixo do piso",
      highRisk: "Risco alto",
      unclearScope: "Escopo pouco claro",
      retainerWithoutVolume: "Retainer sem volume minimo",
    });

    function getCanonicalTraceMetricName(metric) {
      return isTraceabilityMetricV1(metric) ? metric : null;
    }

    function getTraceMetricNodes() {
      return Array.from(document.querySelectorAll("[data-trace-metric]"));
    }

    function getTraceableInputNodes() {
      return Array.from(document.querySelectorAll("[data-input-key]"))
        .filter((node) => TRACEABILITY_INPUT_KEYS_V1.includes(node.getAttribute("data-input-key")));
    }

    function resolveTraceabilityDrivers(metric, vm) {
      if (!vm || vm.status !== "ready" || !vm.result || !vm.result.traceability) return [];
      const canonicalMetric = getCanonicalTraceMetricName(metric);
      if (!canonicalMetric) return [];
      const list = Array.isArray(vm.result.traceability[canonicalMetric])
        ? vm.result.traceability[canonicalMetric]
        : [];
      return list
        .filter((driver) => {
          if (!driver || !TRACEABILITY_INPUT_KEYS_V1.includes(driver.inputKey)) return false;
          if (!driver.reasonCode) return true;
          return TRACEABILITY_REASON_TO_INPUT_KEY_V1[driver.reasonCode] === driver.inputKey;
        })
        .slice(0, 3);
    }

    function applyTraceabilityUiState() {
      const isActive = !!traceabilityUiState.activeMetric;
      document.body.classList.toggle("traceability-mode-active", isActive);

      const activeInputSet = new Set(traceabilityUiState.activeInputKeys || []);
      getTraceableInputNodes().forEach((node) => {
        const key = node.getAttribute("data-input-key");
        const isHighlighted = isActive && activeInputSet.has(key);
        node.classList.toggle("trace-input-dim", isActive && !isHighlighted);
        node.classList.toggle("trace-input-active", isHighlighted);
      });

      getTraceMetricNodes().forEach((node) => {
        const metric = getCanonicalTraceMetricName(node.getAttribute("data-trace-metric"));
        const isMetricActive = isActive && metric === traceabilityUiState.activeMetric;
        node.classList.toggle("trace-metric-active", isMetricActive);
        node.classList.toggle("trace-metric-dim", isActive && !isMetricActive);
      });
    }

    function exitTraceabilityMode() {
      traceabilityUiState = { activeMetric: null, activeInputKeys: [] };
      applyTraceabilityUiState();
    }

    function activateTraceabilityMode(metric, options = {}) {
      const canonicalMetric = getCanonicalTraceMetricName(metric);
      if (!canonicalMetric) {
        exitTraceabilityMode();
        return;
      }

      if (options.toggle && traceabilityUiState.activeMetric === canonicalMetric) {
        exitTraceabilityMode();
        return;
      }

      const drivers = resolveTraceabilityDrivers(canonicalMetric, latestPricingEngineV1Vm);
      if (!drivers.length) {
        exitTraceabilityMode();
        return;
      }

      traceabilityUiState = {
        activeMetric: canonicalMetric,
        activeInputKeys: drivers.map((driver) => driver.inputKey),
      };
      applyTraceabilityUiState();
    }

    function syncTraceabilityModeWithVm(vm) {
      latestPricingEngineV1Vm = vm;
      if (!traceabilityUiState.activeMetric) return;
      const drivers = resolveTraceabilityDrivers(traceabilityUiState.activeMetric, vm);
      if (!drivers.length) {
        exitTraceabilityMode();
        return;
      }
      traceabilityUiState = {
        activeMetric: traceabilityUiState.activeMetric,
        activeInputKeys: drivers.map((driver) => driver.inputKey),
      };
      applyTraceabilityUiState();
    }

    function bindTraceabilityModeEvents() {
      if (traceabilityListenersBound) return;

      const supportsHover =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches;

      getTraceMetricNodes().forEach((node) => {
        const metric = getCanonicalTraceMetricName(node.getAttribute("data-trace-metric"));
        if (!metric) return;

        if (supportsHover) {
          node.addEventListener("mouseenter", () => activateTraceabilityMode(metric));
          node.addEventListener("mouseleave", () => exitTraceabilityMode());
          node.addEventListener("focus", () => activateTraceabilityMode(metric));
          node.addEventListener("blur", () => exitTraceabilityMode());
        }

        node.addEventListener("click", (event) => {
          event.preventDefault();
          activateTraceabilityMode(metric, { toggle: true });
        });
      });

      document.addEventListener("click", (event) => {
        if (!traceabilityUiState.activeMetric) return;
        if (event.target.closest("[data-trace-metric]") || event.target.closest("[data-input-key]")) return;
        exitTraceabilityMode();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && traceabilityUiState.activeMetric) {
          exitTraceabilityMode();
        }
      });

      traceabilityListenersBound = true;
    }

    function getProjectPricingUiInputs() {
      const scopeClarityRaw = ((els.scopeClarity && els.scopeClarity.value) || "clear").toLowerCase();
      const revisionLoadRaw = ((els.revisionLoad && els.revisionLoad.value) || "low").toLowerCase();
      const engagementModelRaw = ((els.engagementModel && els.engagementModel.value) || "project").toLowerCase();
      return {
        scopeClarity: ["clear", "partial", "unclear"].includes(scopeClarityRaw) ? scopeClarityRaw : "clear",
        urgentDeadline: !!(els.urgentDeadline && els.urgentDeadline.checked),
        revisionLoad: ["low", "medium", "high"].includes(revisionLoadRaw) ? revisionLoadRaw : "low",
        engagementModel: engagementModelRaw === "retainer" ? "retainer" : "project",
        monthlyVolumeHours: clamp(toNum(els.monthlyVolumeHours && els.monthlyVolumeHours.value), 0, 100000),
      };
    }

    function buildPricingEngineV1InputFromState(s) {
      const projectUi = getProjectPricingUiInputs();
      return {
        targetIncome: s.targetIncome,
        monthlyCosts: s.monthlyCosts,
        taxRate: s.taxRate,
        profitMargin: s.profitMargin,
        buffer: s.buffer,
        utilization: s.utilization,
        scopeRisk: s.scopeRisk,
        discount: s.discount,
        vacationWeeks: s.vacationWeeks,
        hoursPerDay: s.hoursPerDay,
        daysPerWeek: s.daysPerWeek,
        projectHours: s.projectHours,
        scopeClarity: projectUi.scopeClarity,
        urgentDeadline: projectUi.urgentDeadline,
        revisionLoad: projectUi.revisionLoad,
        engagementModel: projectUi.engagementModel,
        monthlyVolumeHours: projectUi.engagementModel === "retainer" ? projectUi.monthlyVolumeHours : 0,
      };
    }

    function buildPricingUiV1ViewModel(s) {
      if (typeof computePricingEngineV1 !== "function") {
        return { status: "error", message: "Motor v1 indisponivel no bootstrap.", result: null };
      }
      if (!(Number(s.projectHours) > 0)) {
        return { status: "empty", message: "Preencha horas do projeto para exibir o pricing band.", result: null };
      }
      try {
        const result = computePricingEngineV1(buildPricingEngineV1InputFromState(s));
        if (!result || !result.pricingBand || !result.rates || !result.economics || !result.project || !result.traceability) {
          return { status: "error", message: "Contrato do motor v1 invalido.", result: null };
        }
        return { status: "ready", message: "", result };
      } catch (err) {
        const msg = err && err.message ? err.message : "Erro ao calcular motor v1.";
        return { status: "error", message: msg, result: null };
      }
    }

    function clearListNode(node) {
      if (!node) return;
      while (node.firstChild) node.removeChild(node.firstChild);
    }

    function appendListRow(node, text, tone = "default") {
      if (!node) return;
      const li = document.createElement("li");
      li.className = "rounded-lg border border-white/10 bg-white/5 px-2 py-1";
      if (tone === "critical") li.classList.add("text-rose-300", "border-rose-400/30", "bg-rose-500/10");
      if (tone === "ok") li.classList.add("text-emerald-300", "border-emerald-400/30", "bg-emerald-500/10");
      li.textContent = text;
      node.appendChild(li);
    }

    function renderPricingHud(s, vm) {
      const hasData = vm && vm.status === "ready" && vm.result;
      const placeholder = "-";
      const curr = s.currency;

      const pricingBand = hasData ? vm.result.pricingBand : null;
      const project = hasData ? vm.result.project : null;
      const guardrails = hasData ? (vm.result.guardrails || {}) : {};

      const heroValue = project
        ? (project.discountPct > 0 ? project.totalAfterDiscount : project.total)
        : null;

      safeMoney(els.pricingHudHeroValue, heroValue != null ? fmtMoney(heroValue, curr) : placeholder);
      safeMoney(els.pricingHudFloorValue, pricingBand ? fmtMoney(pricingBand.piso, curr) : placeholder);
      safeMoney(els.pricingHudSustainableValue, pricingBand ? fmtMoney(pricingBand.sustentavel, curr) : placeholder);
      safeMoney(els.pricingHudIdealValue, pricingBand ? fmtMoney(pricingBand.ideal, curr) : placeholder);

      if (els.pricingHudHeroTag) {
        const firstDriver = hasData
          ? resolveTraceabilityDrivers("heroPrice", vm)[0]
          : null;
        const tag = firstDriver && firstDriver.reasonCode
          ? (TRACEABILITY_METRIC_TAGS.heroPrice || "drives price")
          : (hasData ? "stable" : "");
        safeText(els.pricingHudHeroTag, tag);
      }

      if (els.pricingHudRiskLabel && els.pricingHudRiskDot) {
        const activeCount = Object.values(guardrails).filter(Boolean).length;
        let label = "Estavel";
        let dotClass = "bg-emerald-400";
        if (activeCount >= 2) {
          label = "Critico";
          dotClass = "bg-rose-400";
        } else if (activeCount === 1) {
          label = "Atencao";
          dotClass = "bg-amber-400";
        }
        if (!hasData) {
          label = "Sem dados";
          dotClass = "bg-slate-500";
        }

        els.pricingHudRiskDot.classList.remove("bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-slate-500");
        els.pricingHudRiskDot.classList.add(dotClass);
        safeText(els.pricingHudRiskLabel, hasData ? `${label} (${activeCount})` : label);
      }
    }

    function renderPricingEngineV1Card(s, vm) {
      if (!els.pricingEngineV1Card) return;

      const curr = s.currency;
      const hasData = vm && vm.status === "ready" && vm.result;
      const placeholder = "-";
      const projectUi = getProjectPricingUiInputs();

      if (els.monthlyVolumeHoursWrap) {
        els.monthlyVolumeHoursWrap.classList.toggle("hidden", projectUi.engagementModel !== "retainer");
      }

      if (els.pricingEngineV1Status) {
        const statusText = vm.status === "ready"
          ? `Contrato v${vm.result.contractVersion} carregado.`
          : (vm.status === "empty" ? vm.message : `Erro: ${vm.message}`);
        safeText(els.pricingEngineV1Status, statusText);
      }

      const pricingBand = hasData ? vm.result.pricingBand : null;
      const rates = hasData ? vm.result.rates : null;
      const economics = hasData ? vm.result.economics : null;
      const project = hasData ? vm.result.project : null;

      renderPricingHud(s, vm);

      safeMoney(els.pricingBandPiso, pricingBand ? fmtMoney(pricingBand.piso, curr) : placeholder);
      safeMoney(els.pricingBandSustentavel, pricingBand ? fmtMoney(pricingBand.sustentavel, curr) : placeholder);
      safeMoney(els.pricingBandIdeal, pricingBand ? fmtMoney(pricingBand.ideal, curr) : placeholder);
      safeMoney(els.pricingProjectTotal, project ? fmtMoney(project.total, curr) : placeholder);
      safeText(els.pricingProjectHours, project ? `${fmtNumber(project.estimatedHours, 0)} h` : placeholder);
      safeText(
        els.pricingProjectDiscountImpact,
        project
          ? (project.discountPct > 0
            ? `-${fmtMoney(project.discountImpact, curr)} (${fmtNumber(project.discountPct, 1)}%)`
            : "Sem desconto")
          : placeholder
      );
      safeMoney(els.pricingRateHora, rates ? fmtMoney(rates.hora, curr) : placeholder);
      safeMoney(els.pricingRateDia, rates ? fmtMoney(rates.dia, curr) : placeholder);
      safeMoney(els.pricingEconomicsFaturamentoAlvo, economics ? fmtMoney(economics.faturamentoAlvo, curr) : placeholder);
      safeText(els.pricingEconomicsHorasFaturaveisMes, economics ? `${fmtNumber(economics.horasFaturaveisMes, 1)} h` : placeholder);
      safeText(els.pricingEconomicsOcupacaoReal, economics ? `${fmtNumber(economics.ocupacaoReal * 100, 1)}%` : placeholder);

      clearListNode(els.pricingGuardrailsList);
      if (vm.status === "error") {
        appendListRow(els.pricingGuardrailsList, vm.message, "critical");
      } else if (vm.status === "empty") {
        appendListRow(els.pricingGuardrailsList, vm.message, "default");
      } else {
        const guardrails = vm.result.guardrails || {};
        Object.keys(PRICING_GUARDRAIL_LABELS).forEach((key) => {
          const isActive = !!guardrails[key];
          const label = PRICING_GUARDRAIL_LABELS[key];
          appendListRow(
            els.pricingGuardrailsList,
            `${label}: ${isActive ? "ATIVO" : "OK"}`,
            isActive ? "critical" : "ok"
          );
        });
      }

      clearListNode(els.pricingExplainFactorsList);
      if (vm.status === "error") {
        appendListRow(els.pricingExplainFactorsList, "Sem fatores: erro no motor v1.", "critical");
      } else if (vm.status === "empty") {
        appendListRow(els.pricingExplainFactorsList, "Sem fatores: preencha horas do projeto.", "default");
      } else {
        const factors = Array.isArray(vm.result.explainFactors) ? vm.result.explainFactors.slice(0, 3) : [];
        if (!factors.length) {
          appendListRow(els.pricingExplainFactorsList, "Sem fatores adicionais no cenario atual.", "default");
        } else {
          factors.forEach((factor) => {
            const label = PRICING_REASON_LABELS[factor.code] || factor.code;
            appendListRow(
              els.pricingExplainFactorsList,
              `${label}: +${fmtMoney(factor.impactoValor, curr)} (${fmtNumber(factor.impactoPct, 2)}%)`,
              "default"
            );
          });
        }
      }

      syncTraceabilityModeWithVm(vm);
    }
    function buildPricingContext(s) {
      const essential = compute(s);
      if (!s.advancedMode || !computeAdvancedPricing) {
        return { mode: "essential", effective: essential, essential, advanced: null, warning: "" };
      }
      if (!essential.ok) {
        return { mode: "advanced_fallback", effective: essential, essential, advanced: null, warning: "Modo Avancado indisponivel ate corrigir os dados essenciais." };
      }
      const history = deriveHistoricalVarianceSamples(getAuditTrail ? getAuditTrail() : []);
      const advanced = computeAdvancedPricing({
        state: s,
        essential,
        useMonteCarlo: !!s.enableMonteCarlo,
        historicalSamples: history,
      });
      if (!advanced.ok || !advanced.output || !advanced.output.ok) {
        return {
          mode: "advanced_fallback",
          effective: essential,
          essential,
          advanced: null,
          warning: (advanced && advanced.error && advanced.error.message) || "Modo Avancado invalido. Retornamos para o Modo Essencial.",
        };
      }
      return { mode: "advanced", effective: advanced.output, essential, advanced, warning: "" };
    }

    function formatScopeLevel(level) {
      if (level === "high") return "alto";
      if (level === "medium") return "mÃ©dio";
      return "baixo";
    }

    function buildNegotiationContext(s, r) {
      const scopeShield = computeScopeShielding({
        historicoMuitasAlteracoes: !!s.riskHistoricoAlteracoes,
        comunicacaoFragmentada: !!s.riskComunicacaoFragmentada,
        tomadorIndefinido: !!s.riskTomadorIndefinido,
        escopoIncompleto: !!s.riskEscopoIncompleto,
        urgenciaSemBriefing: !!s.riskUrgenciaSemBriefing,
      });
      const scarcity = computeDynamicScarcityMarkup(s.ocupacaoAgenda);
      const roi = computeRoiAnchor({ impactoNoNegocio: s.impactoNoNegocio, areaImpacto: s.areaImpacto });
      const runway = computeRunwaySummary({
        reservaMetaMeses: s.reservaMetaMeses,
        reservaAtual: s.reservaAtual,
        custoPessoalMensal: s.custoPessoalMensal,
        targetIncome: s.targetIncome,
        monthlyCosts: s.monthlyCosts,
        projectNet: r.projectNet,
      });
      const justification = generateJustificationBlocks({ state: s, scopeShield, scarcity, roi });
      const projectNet = Number(r.projectNet || 0);
      const shieldImpact = projectNet * (scopeShield.markupPct / 100);
      const scarcityImpact = projectNet * (scarcity.markupPct / 100);
      return { scopeShield, scarcity, roi, runway, justification, shieldImpact, scarcityImpact };
    }

    function syncProposalJustificationButton() {
      if (!els.btnInsertProposalJustification) return;
      const isPinned = !!proposalJustificationPinned;
      els.btnInsertProposalJustification.textContent = isPinned ? "Usar texto curto" : "Usar justificativa completa";
    }

    function scheduleAuditSnapshot() {
      clearTimeout(auditDebounceTimer);
      auditDebounceTimer = setTimeout(() => {
        const s = getStateFromInputs();
        const r = buildPricingContext(s).effective;
        if (!r.ok || !hasAcceptedTerms()) return;
        const snapshot = {
          inputs: { ...s },
          outputs: { revenueTarget: r.revenueTarget, hourly: r.hourly, daily: r.daily, projectGross: r.projectGross, projectNet: r.projectNet },
        };
        const str = JSON.stringify(snapshot);
        if (str !== lastAuditSnapshotStr) {
          appendAuditSnapshot(snapshot);
          lastAuditSnapshotStr = str;
        }
      }, AUDIT_DEBOUNCE_MS);
    }

    function updateUI() {
        let s = getStateFromInputs();
        const canonicalUiMode = getCanonicalUiMode(s.uiMode);
        if (canonicalUiMode !== currentUiMode) {
          currentUiMode = canonicalUiMode;
          s = { ...s, uiMode: currentUiMode };
        }
        if (typeof resolveUiModeTabIndex === "function" && typeof activateUiModeTab === "function") {
          const safeIdx = resolveUiModeTabIndex(currentUiMode);
          activateUiModeTab(safeIdx, { persist: false });
        }
        const pricingCtx = buildPricingContext(s);
      const r = pricingCtx.effective;
      const negotiationCtx = buildNegotiationContext(s, r);

      const outputs = {
        essential: r,
        agency: computeAgencyEquivalent ? computeAgencyEquivalent({ projectHours: s.projectHours, hourly: r?.hourly, projectNet: r?.projectNet }) : null,
        inacao: (FEATURE_FLAGS.inacao_enabled && s.modoEstrategista && s.projectHours > 0 && r?.projectNet != null)
          ? (computeStrategistMetrics ? computeStrategistMetrics({ precoBase: r.projectNet, valorGanhoEstimado12m: s.valorGanhoEstimado12m, custoOportunidadeMensal: s.custoOportunidadeMensal }) : null)
          : null,
        batna: FEATURE_FLAGS.batna_enabled && negotiationCtx?.runway ? { batnaLevel: negotiationCtx.runway.batnaLevel, batnaMessage: negotiationCtx.runway.batnaMessage } : null,
        tiers: FEATURE_FLAGS.tiers_enabled && r?.projectNet != null ? computeTierPricing(r.projectNet) : null,
      };
      const proposalMetrics = buildProposalMetrics(s, outputs, FEATURE_FLAGS);

      if (els.taxRate) els.taxRate.value = s.taxRate;
      if (els.profitMargin) els.profitMargin.value = s.profitMargin;
      if (els.buffer) els.buffer.value = s.buffer;
      if (els.utilization) els.utilization.value = s.utilization;
      if (els.hoursPerDay) els.hoursPerDay.value = s.hoursPerDay;
      if (els.daysPerWeek) els.daysPerWeek.value = s.daysPerWeek;
      if (els.vacationWeeks) els.vacationWeeks.value = s.vacationWeeks;
      if (els.scopeRisk) els.scopeRisk.value = s.scopeRisk;
      if (els.discount) els.discount.value = s.discount;
      if (els.assetValue) els.assetValue.value = s.assetValue;
      if (els.assetUsefulLifeMonths) els.assetUsefulLifeMonths.value = s.assetUsefulLifeMonths;
      if (els.opportunityRateAnnual) els.opportunityRateAnnual.value = s.opportunityRateAnnual;
      if (els.occupancyRate) els.occupancyRate.value = s.occupancyRate;
      if (els.weeklyHours) els.weeklyHours.value = s.weeklyHours;
      if (els.ocupacaoAgenda) els.ocupacaoAgenda.value = s.ocupacaoAgenda;
      if (els.reservaMetaMeses) els.reservaMetaMeses.value = s.reservaMetaMeses;
      if (els.reservaAtual) els.reservaAtual.value = s.reservaAtual;
      if (els.custoPessoalMensal) els.custoPessoalMensal.value = s.custoPessoalMensal;

      const curr = s.currency;
      if (els.resultError) {
        if (pricingCtx.warning) {
          els.resultError.textContent = pricingCtx.warning;
          els.resultError.classList.remove("hidden");
        } else if (!r.ok && r.error) {
          els.resultError.textContent = r.error.message;
          els.resultError.classList.remove("hidden");
        } else {
          els.resultError.classList.add("hidden");
          els.resultError.textContent = "";
        }
      }

      const hourlyOk = r.ok && r.hourly != null;
      safeMoney(els.hourlyRate, hourlyOk ? fmtMoney(r.hourly, curr) : "â€”");
      safeText(els.dailyRate, hourlyOk ? fmtMoney(r.daily, curr) : "â€”");
      safeText(els.hourlyNote, s.advancedMode ? "Baseada na estratÃ©gia premium." : "Baseada na sua capacidade faturÃ¡vel.");
      if (els.dailyLabel) safeText(els.dailyLabel, `Taxa/dia (${fmtNumber(s.hoursPerDay, 1)}h)`);
      safeText(els.billableHours, r.billableHours != null ? `${fmtNumber(r.billableHours, 1)} h` : "â€”");
      safeMoney(els.revenueTarget, r.ok && r.revenueTarget != null ? fmtMoney(r.revenueTarget, curr) : "â€”");
      safeText(els.revenueBreakdown, `Base: ${fmtMoney(r.baseNeed, curr)} â€¢ Total: ${fmtNumber(s.taxRate, 1)}% + ${fmtNumber(s.profitMargin, 1)}% + ${fmtNumber(s.buffer, 1)}% = ${fmtNumber(r.totalPercent, 1)}%`);
      safeText(els.stepCost, `${fmtMoney(s.targetIncome, curr)} + ${fmtMoney(s.monthlyCosts, curr)} = ${fmtMoney(r.baseNeed, curr)}`);
      safeText(els.stepTax, `${fmtNumber(s.taxRate, 1)}% + ${fmtNumber(s.profitMargin, 1)}% + ${fmtNumber(s.buffer, 1)}% = ${fmtNumber(r.totalPercent, 1)}%`);
      if (!r.ok && r.error) safeText(els.stepProfit, r.error.message);
      else if (r.ok && r.revenueTarget != null) safeText(els.stepProfit, `${fmtMoney(r.baseNeed, curr)} Ã· (1 âˆ’ ${fmtNumber(r.totalPercent, 1)}%) = ${fmtMoney(r.revenueTarget, curr)}`);
      else safeText(els.stepProfit, "â€”");
      safeText(els.stepHours, `Semanas Ãºteis/ano: ${fmtNumber(r.workingWeeks, 1)} â€¢ Horas/mÃªs: ${fmtNumber(r.hoursPerMonth, 1)} â€¢ FaturÃ¡veis: ${fmtNumber(r.billableHours, 1)}`);

      const projectOk = hourlyOk && s.projectHours > 0 && r.ok && r.projectNet != null;
      safeMoney(els.projectPrice, projectOk ? fmtMoney(r.projectNet, curr) : "â€”");
      if (els.projectHint) {
        if (s.proposalMode) {
          safeText(els.projectHint, "");
          els.projectHint.classList.add("hidden");
        } else {
          els.projectHint.classList.remove("hidden");
          safeText(els.projectHint, projectOk ? `(${fmtNumber(s.projectHours, 0)}h Ã— taxa/hora) com +${fmtNumber(s.scopeRisk, 1)}% margem e âˆ’${fmtNumber(s.discount, 1)}% desconto.` : "Preencha as horas para estimar.");
        }
      }

      let proposalBaseText = "â€”";
      if (projectOk) {
        const prazoDiasUteis = Math.ceil((s.projectHours / Math.max(1, s.hoursPerDay)) * (100 / s.utilization));
        const anti = (() => {
          const phrases = [...NEGOTIATION_PHRASES];
          if (negotiationCtx && negotiationCtx.roi && negotiationCtx.roi.enabled && negotiationCtx.roi.text) {
            phrases.unshift(`${negotiationCtx.roi.text} ${negotiationCtx.roi.caveat}`);
          }
          return phrases.slice(0, 8)[0] || "";
        })();
        proposalBaseText = `Proposta comercial para execuÃ§Ã£o do projeto. Investimento: ${fmtMoney(r.projectNet, curr)}. Prazo estimado: ~${fmtNumber(prazoDiasUteis, 0)} dias Ãºteis. ${anti}`;
      }
      safeText(els.proposalText, proposalBaseText);

      updateRiskThermometer(s);
      persistState(s);

      if (els.agencyEquivalentBlock && FEATURE_FLAGS.agency_enabled && proposalMetrics.clientSafe.agencyEconomiaValor != null) {
        els.agencyEquivalentBlock.classList.remove("hidden");
        if (els.agencyTotalLabel) safeText(els.agencyTotalLabel, fmtMoney(proposalMetrics.clientSafe.agencyEconomiaValor, curr));
        if (els.agencySavingsBadge) safeText(els.agencySavingsBadge, proposalMetrics.clientSafe.agencyEconomiaPercentual != null ? `${proposalMetrics.clientSafe.agencyEconomiaPercentual}% economia` : "");
      } else if (els.agencyEquivalentBlock) els.agencyEquivalentBlock.classList.add("hidden");

      if (els.batnaMeterBlock && proposalMetrics.internalOnly && (proposalMetrics.internalOnly.batnaLevel || proposalMetrics.internalOnly.batnaMessage)) {
        els.batnaMeterBlock.classList.remove("hidden");
        if (els.batnaLevelBadge) safeText(els.batnaLevelBadge, proposalMetrics.internalOnly.batnaLevel ?? "â€”");
        if (els.batnaMessage) safeText(els.batnaMessage, proposalMetrics.internalOnly.batnaMessage ?? "â€”");
      } else if (els.batnaMeterBlock) els.batnaMeterBlock.classList.add("hidden");

      const canComputeProposal = !!(r.ok && s.projectHours > 0 && r.projectNet != null);
      if (els.configWrapper) els.configWrapper.classList.toggle("hidden", !!s.proposalMode && canComputeProposal);
      if (els.wizardContainer && FEATURE_FLAGS.ui_wizard_enabled) {
        els.wizardContainer.classList.toggle("hidden", !!s.proposalMode);
      }
      if (els.advancedConfigCard) {
        els.advancedConfigCard.classList.toggle("hidden", !s.advancedMode);
      }
      if (els.advancedTeaserCard) {
        els.advancedTeaserCard.classList.toggle("hidden", !!s.advancedMode);
      }
      const strategistEnabled = !!FEATURE_FLAGS.strategist_mode_enabled;
      const strategistActive = strategistEnabled && !!s.modoEstrategista;
      const accordionStrategist = document.querySelector(".strategist-accordion-btn");
      if (accordionStrategist) accordionStrategist.classList.toggle("hidden", !strategistEnabled);
      if (els.strategistInputsWrap) els.strategistInputsWrap.classList.toggle("hidden", !strategistActive);
      if (els.strategistInputsWrap) els.strategistInputsWrap.classList.toggle("grid", strategistActive);
      if (els.strategistResultsCard) els.strategistResultsCard.classList.toggle("hidden", !strategistActive);
      if (!strategistEnabled && currentUiMode === "estrategista") {
        currentUiMode = "essencial";
        persistState({ ...getStateFromInputs(), uiMode: currentUiMode });
        const tabEssential = document.getElementById("tab-essential");
        const panelEssential = document.getElementById("panel-essential");
        if (tabEssential) {
          tabEssential.setAttribute("aria-selected", "true");
          tabEssential.tabIndex = 0;
        }
        if (panelEssential) {
          panelEssential.classList.remove("hidden");
          panelEssential.classList.add("tab-panel-visible");
          panelEssential.setAttribute("aria-hidden", "false");
        }
        TAB_IDS.forEach((id, idx) => {
          if (id === "tab-essential") return;
          const tab = document.getElementById(id);
          const panel = tab && document.getElementById(tab.getAttribute("aria-controls"));
          if (tab) {
            tab.setAttribute("aria-selected", "false");
            tab.tabIndex = -1;
          }
          if (panel) {
            panel.classList.add("hidden");
            panel.classList.remove("tab-panel-visible");
            panel.setAttribute("aria-hidden", "true");
          }
        });
        if (els.activeModeLabel) safeText(els.activeModeLabel, "Modo ativo: Essencial");
        const hintEl = document.getElementById("tabContextHint");
        if (hintEl) safeText(hintEl, TAB_CONTEXT_HINTS.essencial ?? "");
      }
      if (els.calcCard) {
        if (s.proposalMode) {
          if (!calcCardStash && els.calcCard.parentNode) {
            const parent = els.calcCard.parentNode;
            const nextSibling = els.calcCard.nextSibling;
            parent.removeChild(els.calcCard);
            calcCardStash = { node: els.calcCard, parent, nextSibling };
          }
        } else {
          if (calcCardStash) {
            calcCardStash.parent.insertBefore(calcCardStash.node, calcCardStash.nextSibling);
            calcCardStash = null;
          }
        }
      }

      if (els.resultCardsInternal) {
        els.resultCardsInternal.classList.toggle("hidden", !!s.proposalMode);
      }
      if (els.resultCardProposal) {
        els.resultCardProposal.classList.toggle("hidden", !s.proposalMode);
      }
      if (s.proposalMode && els.resultProposalTotal && els.resultProposalPrazo) {
        const hasHours = s.projectHours > 0;
        let prazoText = "-";
        if (hasHours) {
          if (s.hoursPerDay > 0 && s.utilization > 0) {
            const prazoDias = Math.ceil((s.projectHours / Math.max(1, s.hoursPerDay)) * (100 / Math.max(1, s.utilization)));
            prazoText = `~${fmtNumber(prazoDias, 0)} dias uteis`;
          } else {
            prazoText = `${fmtNumber(s.projectHours, 0)}h`;
          }
        }

        if (canComputeProposal) {
          safeMoney(els.resultProposalTotal, fmtMoney(r.projectNet, s.currency));
          safeText(els.resultProposalPrazo, prazoText);
          if (els.resultError) {
            els.resultError.classList.add("hidden");
            els.resultError.textContent = "";
          }
        } else {
          safeText(els.resultProposalTotal, "Preencha as entradas essenciais para calcular o investimento.");
          safeText(els.resultProposalPrazo, prazoText);
          if (els.resultError) {
            const baseMsg = (r && r.error && r.error.message)
              ? r.error.message
              : "Dados insuficientes para calcular.";
            els.resultError.textContent = `Modo Proposta: ${baseMsg}`;
            els.resultError.classList.remove("hidden");
          }
        }
      }
      if (els.proposalValorGanhoBlock && els.resultProposalValorGanho) {
        if (FEATURE_FLAGS.ui_preview_anchor_enabled) {
          const hasValorGanho = !!s.modoEstrategista && s.valorGanhoEstimado12m > 0;
          els.proposalValorGanhoBlock.classList.remove("hidden");
          safeText(els.resultProposalValorGanho, hasValorGanho ? fmtMoney(s.valorGanhoEstimado12m, s.currency) : "Preencha dados estratÃ©gicos para estimar.");
        } else {
          els.proposalValorGanhoBlock.classList.add("hidden");
        }
      }

      if (r.ok && hasAcceptedTerms()) {
        scheduleAuditSnapshot();
      }

      const calcOk = r.ok;
      const errMsg = r.error ? r.error.message : "";
      const termsOk = hasAcceptedTerms();
      const pdfOk = s.proposalMode
        ? (r.ok && s.projectHours > 0 && r.projectNet != null)
        : calcOk;
      if (els.btnPdf) {
        els.btnPdf.disabled = !pdfOk;
        els.btnPdf.title = pdfOk ? "" : (errMsg || "Preencha os dados para gerar o PDF.");
      }
      if (els.btnPdfProposal) {
        els.btnPdfProposal.disabled = els.btnPdf ? els.btnPdf.disabled : true;
        els.btnPdfProposal.title = els.btnPdf ? els.btnPdf.title : (errMsg || "Preencha os dados para gerar o PDF.");
      }
      if (els.btnPdfFromPreview) {
        els.btnPdfFromPreview.disabled = !pdfOk || !termsOk;
        els.btnPdfFromPreview.title = (pdfOk && termsOk) ? "" : (errMsg || "Preencha os dados para gerar o PDF.");
      }
      if (els.btnPrimaryPdfHeader) {
        els.btnPrimaryPdfHeader.disabled = !pdfOk || !termsOk;
        els.btnPrimaryPdfHeader.style.pointerEvents = (!pdfOk || !termsOk) ? "none" : "";
        els.btnPrimaryPdfHeader.title = (pdfOk && termsOk) ? "" : (errMsg || "Preencha os dados para gerar o PDF.");
        els.btnPrimaryPdfHeader.textContent = s.proposalMode ? "Gerar proposta agora" : "Gerar proposta em PDF";
      }
      if (els.pdfInternalFormatWrap) {
        els.pdfInternalFormatWrap.classList.toggle("hidden", !!s.proposalMode || !FEATURE_FLAGS.pdf_internal_compact_enabled);
      }
      if (FEATURE_FLAGS.ui_wizard_enabled && els.wizardBottomBar && els.wizardBottomBarValue && els.btnWizardBottomPdf) {
        const showBar = !s.proposalMode;
        els.wizardBottomBar.classList.toggle("hidden", !showBar);
        els.wizardBottomBar.setAttribute("aria-hidden", String(!showBar));
        document.body.classList.toggle("wizard-bar-visible", showBar);
        if (showBar) {
          const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
          const val = projectOk ? fmtMoney(r.projectNet, s.currency) : (r.ok && r.hourly != null ? fmtMoney(r.hourly, s.currency) : "â€”");
          safeText(els.wizardBottomBarValue, val);
          els.btnWizardBottomPdf.disabled = !pdfOk || !hasAcceptedTerms();
        }
      }
      if (FEATURE_FLAGS.ui_mobile_a11y_enabled && !FEATURE_FLAGS.ui_wizard_enabled && els.mobileA11yBar && els.mobileA11yBarValue && els.btnMobileA11yPdf) {
        const showBar = !s.proposalMode;
        els.mobileA11yBar.classList.toggle("hidden", !showBar);
        els.mobileA11yBar.setAttribute("aria-hidden", String(!showBar));
        document.body.classList.toggle("mobile-a11y-bar-visible", showBar);
        if (showBar) {
          const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
          const val = projectOk ? fmtMoney(r.projectNet, s.currency) : (r.ok && r.hourly != null ? fmtMoney(r.hourly, s.currency) : "â€”");
          safeText(els.mobileA11yBarValue, val);
          els.btnMobileA11yPdf.disabled = !pdfOk || !hasAcceptedTerms();
        }
      }
      if (els.advancedModeWrap && els.advancedModeLabel) {
        const isPremium = !!s.advancedMode;
        els.advancedModeLabel.textContent = isPremium ? "Premium" : "Essencial";
        els.advancedModeWrap.classList.toggle("border-indigo-400/30", isPremium);
        els.advancedModeWrap.classList.toggle("bg-indigo-500/15", isPremium);
        els.advancedModeWrap.classList.toggle("text-indigo-100", isPremium);
        els.advancedModeWrap.classList.toggle("border-white/10", !isPremium);
        els.advancedModeWrap.classList.toggle("bg-ink-900/70", !isPremium);
        els.advancedModeWrap.classList.toggle("text-slate-100", !isPremium);
      }
      if (els.logoStateText) els.logoStateText.textContent = logoDataUrl ? "Logo carregada" : "Adicionar logo";
      if (els.btnRemoveLogo) els.btnRemoveLogo.classList.toggle("hidden", !logoDataUrl);
      if (els.btnCopyHourly) {
        els.btnCopyHourly.disabled = !calcOk;
        els.btnCopyHourly.title = calcOk ? "" : (errMsg || "Calcule a taxa/hora primeiro.");
      }
      if (els.btnCopyProject) {
        const projectOk = calcOk && r.projectNet != null && s.projectHours > 0;
        els.btnCopyProject.disabled = !projectOk;
        els.btnCopyProject.title = projectOk ? "" : (errMsg || "Preencha horas do projeto e calcule.");
      }
      if (els.btnCopyProposal) {
        const proposalOk = calcOk && s.projectHours > 0 && r.projectNet != null;
        els.btnCopyProposal.disabled = !proposalOk;
        els.btnCopyProposal.title = proposalOk ? "" : "Preencha horas e calcule o investimento.";
      }
      if (els.btnPdf) els.btnPdf.disabled = els.btnPdf.disabled || !termsOk;
      if (els.btnPdfProposal) els.btnPdfProposal.disabled = els.btnPdfProposal.disabled || !termsOk;
      if (els.btnCopyHourly) els.btnCopyHourly.disabled = els.btnCopyHourly.disabled || !termsOk;
      if (els.btnCopyProject) els.btnCopyProject.disabled = els.btnCopyProject.disabled || !termsOk;
      if (els.btnCopyProposal) els.btnCopyProposal.disabled = els.btnCopyProposal.disabled || !termsOk;
      if (els.btnShare) {
        els.btnShare.disabled = !termsOk;
        els.btnShare.title = termsOk ? "Copiar link interno (uso interno; para cliente envie o PDF)" : "Aceite os termos no inÃ­cio da pÃ¡gina para copiar o link.";
      }
      if (els.btnExportConfig) {
        els.btnExportConfig.disabled = !termsOk;
        els.btnExportConfig.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para exportar.";
      }
      if (els.toolsExport) {
        els.toolsExport.disabled = !termsOk;
        els.toolsExport.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para exportar.";
      }
      if (els.toolsImport) {
        els.toolsImport.disabled = !termsOk;
        els.toolsImport.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para importar.";
      }
      if (els.btnCopyJustification) {
        els.btnCopyJustification.disabled = !termsOk;
        els.btnCopyJustification.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para copiar.";
      } if (els.btnInsertProposalJustification) {
        const isPinned = !!proposalJustificationPinned;
        els.btnInsertProposalJustification.disabled = !termsOk;
        els.btnInsertProposalJustification.title = termsOk
          ? (isPinned ? "Usando a versÃ£o com justificativa. Clique para voltar ao texto curto." : "Substitui o texto rÃ¡pido pela versÃ£o com justificativa tÃ©cnica.")
          : "Aceite os termos no inÃ­cio da pÃ¡gina para alternar o texto da proposta.";
        els.btnInsertProposalJustification.setAttribute(
          "aria-label",
          termsOk
            ? (isPinned ? "Usar texto curto da proposta" : "Usar texto com justificativa")
            : "Aceite os termos no inÃ­cio da pÃ¡gina para alternar o texto da proposta."
        );
      }
      syncProposalJustificationButton();
    }

    function persistState(s) {
      try {
        const sanitized = sanitizeState(defaultState(), s);
        const payload = {
          schemaVersion: STORAGE_SCHEMA_VERSION,
          data: sanitized,
          savedAt: new Date().toISOString(),
        };
        writeLocal(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }

    function loadState() {
      try {
        const rawV2 = readLocal(STORAGE_KEY);
        if (rawV2) {
          const parsed = JSON.parse(rawV2);
          if (parsed && typeof parsed === "object" && parsed.schemaVersion === STORAGE_SCHEMA_VERSION && parsed.data) {
            return sanitizeState(defaultState(), parsed.data);
          }
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return sanitizeState(defaultState(), parsed);
          }
        }

        const rawLegacy = readLocal(LEGACY_STORAGE_KEY);
        if (!rawLegacy) return null;
        const legacyParsed = JSON.parse(rawLegacy);
        if (!legacyParsed || typeof legacyParsed !== "object" || Array.isArray(legacyParsed)) return null;
        const merged = sanitizeState(defaultState(), { ...defaultState(), ...legacyParsed });
        persistState(merged);
        return merged;
      } catch {
        return null;
      }
    }

    function createEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text != null) el.textContent = text;
        return el;
      }

      function splitMoneyParts(text) {
        const value = String(text ?? "").trim();
        if (!value || value === "â€”") return null;
        const lead = value.match(/^([^\d+\-]+)\s*([\d.,\s\-]+)$/u);
        if (lead) return { symbol: lead[1].trim(), amount: lead[2].trim(), trailing: false };
        const trail = value.match(/^([\d.,\s\-]+)\s*([^\d+\-]+)$/u);
        if (trail) return { symbol: trail[2].trim(), amount: trail[1].trim(), trailing: true };
        return null;
      }

  
    function loadJsonStorage(key, fallback) {
        try {
          const raw = readLocal(key);
          if (!raw) return fallback;
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : fallback;
        } catch {
          return fallback;
        }
      }

      function saveJsonStorage(key, value) {
        try {
          writeLocal(key, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      }

      function loadScenarios() {
        return loadJsonStorage(SCENARIOS_KEY, { A: null, B: null });
      }

      function saveScenarios(data) {
        return saveJsonStorage(SCENARIOS_KEY, data);
      }

      function loadIntegrationSettings() {
        return loadJsonStorage(INTEGRATIONS_KEY, { sheetsUrl: "", notionUrl: "" });
      }

      function saveIntegrationSettings(next) {
        return saveJsonStorage(INTEGRATIONS_KEY, next);
      }

      function getDismissedAlerts() {
        try {
          const raw = readSession(DISMISSED_ALERTS_KEY);
          if (!raw) return {};
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      }

      function dismissAlertForSession(id) {
        const current = getDismissedAlerts();
        current[id] = true;
        try {
          writeSession(DISMISSED_ALERTS_KEY, JSON.stringify(current));
        } catch {
          // ignore
        }
      }

      function computeCompositionParts(s, r, ctx) {
        const parts = buildCompositionPartsModel ? buildCompositionPartsModel(s, r, ctx) : [];
        return Array.isArray(parts) ? parts : [];
      }

      function renderComposition(s, r, ctx) {
        if (!els.compositionChart || !els.compositionLegend) return;
        const parts = computeCompositionParts(s, r, ctx);
        if (!parts.length) {
          els.compositionChart.style.background = "linear-gradient(135deg, #1f2937, #0f172a)";
          els.compositionLegend.textContent = "";
          els.compositionLegend.appendChild(createEl("p", "text-xs text-slate-400", "Preencha os dados vÃ¡lidos para visualizar."));
          return;
        }
        let start = 0;
        const gradients = parts.map((p) => {
          const end = start + p.percent;
          const segment = `${p.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
          start = end;
          return segment;
        });
        els.compositionChart.style.background = `conic-gradient(${gradients.join(", ")})`;
        const curr = sanitizeCurrency(s.currency);
        els.compositionLegend.textContent = "";
        for (const p of parts) {
          const div = createEl("div", "flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-2 py-1");
          const left = createEl("span", "inline-flex items-center gap-2");
          const dot = createEl("span", "h-2.5 w-2.5 rounded-full");
          dot.style.background = p.color;
          const labelSpan = createEl("span", "", p.label);
          left.appendChild(dot);
          left.appendChild(labelSpan);
          const right = createEl("span", "text-slate-200", `${fmtMoney(p.value, curr)} Â· ${fmtNumber(p.percent, 1)}%`);
          div.appendChild(left);
          div.appendChild(right);
          els.compositionLegend.appendChild(div);
        }
      }

      function severityClasses(sev) {
        if (sev === "critical") return "border-red-400/40 bg-red-500/10 text-red-100";
        if (sev === "warning") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
        return "border-sky-400/40 bg-sky-500/10 text-sky-100";
      }

      function renderAlerts(s, r) {
        if (!els.alertsList) return;
        const allAlerts = evaluateBenchmarkAlerts ? evaluateBenchmarkAlerts(s, r) : [];
        const dismissed = getDismissedAlerts();
        const visibleAlerts = allAlerts.filter((a) => !dismissed[a.id]);
        els.alertsList.textContent = "";
        if (!visibleAlerts.length) {
          els.alertsList.appendChild(createEl("p", "text-xs text-slate-400", "Sem alertas no momento. Boa configuraÃ§Ã£o."));
          return;
        }
        for (const a of visibleAlerts) {
          const card = createEl("div", `rounded-xl border px-3 py-2 ${severityClasses(a.severity)}`);
          const inner = createEl("div", "flex items-start justify-between gap-2");
          const left = createEl("div");
          left.appendChild(createEl("p", "text-xs font-semibold uppercase tracking-wide", a.severity));
          left.appendChild(createEl("p", "text-sm font-medium", a.title));
          left.appendChild(createEl("p", "mt-1 text-xs opacity-90", a.message));
          left.appendChild(createEl("p", "mt-1 text-xs opacity-90", `SugestÃ£o: ${a.recommendation}`));
          const btn = createEl("button", "rounded-lg border border-white/20 bg-black/20 px-2 py-1 text-[11px] hover:bg-black/30", "Dispensar");
          btn.setAttribute("type", "button");
          btn.setAttribute("data-dismiss-alert", a.id);
          btn.addEventListener("click", () => {
            dismissAlertForSession(a.id);
            renderAlerts(s, r);
          });
          inner.appendChild(left);
          inner.appendChild(btn);
          card.appendChild(inner);
          els.alertsList.appendChild(card);
        }
      }

      function renderMetricListDom(container, payload) {
        if (!container) return;
        container.textContent = "";
        if (!payload || !payload.outputs) {
          container.appendChild(createEl("p", "text-xs text-slate-400", "Ainda nÃ£o salvo."));
          return;
        }
        const out = payload.outputs;
        const curr = sanitizeCurrency(payload.inputs?.currency || "BRL");
        const rows = [
          ["Taxa/hora", out.hourly, true],
          ["Taxa/dia", out.daily, true],
          ["Faturamento alvo", out.revenueTarget, true],
          ["Horas faturÃ¡veis", out.billableHours, false],
          ["PreÃ§o projeto", out.projectNet, true],
        ];
        for (const [label, value, money] of rows) {
          const text = value == null ? "â€”" : (money ? fmtMoney(value, curr) : `${fmtNumber(value, 1)} h`);
          const div = createEl("div", "flex items-center justify-between");
          div.appendChild(createEl("span", "text-slate-400", label));
          div.appendChild(createEl("span", "text-slate-100", text));
          container.appendChild(div);
        }
      }

      function createDeltaSpan(a, b, key, money, curr) {
        const av = a?.outputs?.[key];
        const bv = b?.outputs?.[key];
        if (av == null || bv == null) return createEl("span", "text-slate-400", `${key}: â€”`);
        const delta = bv - av;
        const sign = delta > 0 ? "+" : "";
        const base = money ? fmtMoney(Math.abs(delta), curr) : `${fmtNumber(Math.abs(delta), 1)} h`;
        const cls = delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-slate-300";
        const text = `${key}: ${sign}${delta < 0 ? "-" : ""}${base}`;
        return createEl("span", cls, text);
      }

      function renderScenariosComparison() {
        const scenarios = loadScenarios();
        renderMetricListDom(els.scenarioAContent, scenarios.A);
        renderMetricListDom(els.scenarioBContent, scenarios.B);
        if (!els.scenarioDelta) return;
        if (!scenarios.A || !scenarios.B) {
          els.scenarioDelta.textContent = "Salve os dois cenÃ¡rios para ver as diferenÃ§as.";
          return;
        }
        const curr = sanitizeCurrency((scenarios.B.inputs && scenarios.B.inputs.currency) || "BRL");
        els.scenarioDelta.textContent = "";
        const keys = [
          ["hourly", true],
          ["daily", true],
          ["revenueTarget", true],
          ["billableHours", false],
          ["projectNet", true],
        ];
        for (let i = 0; i < keys.length; i++) {
          if (i > 0) els.scenarioDelta.appendChild(createEl("span", "text-slate-600", " | "));
          els.scenarioDelta.appendChild(createDeltaSpan(scenarios.A, scenarios.B, keys[i][0], keys[i][1], curr));
        }
      }

      function captureScenarioPayload() {
        const s = getStateFromInputs();
        const ctx = buildPricingContext(s);
        const r = ctx.effective;
        if (!r.ok) return null;
        return {
          savedAt: new Date().toISOString(),
          mode: ctx.mode,
          inputs: { ...s },
          outputs: {
            hourly: r.hourly,
            daily: r.daily,
            revenueTarget: r.revenueTarget,
            billableHours: r.billableHours,
            projectNet: r.projectNet,
          },
        };
      }

      function saveScenario(slot) {
        const payload = captureScenarioPayload();
        if (!payload) {
          showToast("NÃ£o foi possÃ­vel salvar: ajuste os dados para um cÃ¡lculo vÃ¡lido.");
          return;
        }
        const scenarios = loadScenarios();
        scenarios[slot] = payload;
        saveScenarios(scenarios);
        renderScenariosComparison();
        trackEvent("scenario_saved", { slot, mode: payload.mode || "essential" });
        showToast(`CenÃ¡rio ${slot} salvo.`);
      }

      function loadScenario(slot) {
        const scenarios = loadScenarios();
        if (!scenarios[slot] || !scenarios[slot].inputs) {
          showToast(`CenÃ¡rio ${slot} ainda nÃ£o foi salvo.`);
          return;
        }
        setInputsFromState({ ...defaultState(), ...scenarios[slot].inputs });
        updateUI();
        showToast(`CenÃ¡rio ${slot} carregado.`);
      }

      function clearScenarios() {
        saveScenarios({ A: null, B: null });
        renderScenariosComparison();
        showToast("ComparaÃ§Ã£o limpa.");
      }

      function csvEscape(v) {
        const str = String(v ?? "");
        if (/[,"\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
      }

      function buildExportPayload() {
        const inputs = getStateFromInputs();
        const ctx = buildPricingContext(inputs);
        const outputs = ctx.effective;
        const negotiation = buildNegotiationContext(inputs, outputs);
        const metrics = buildProposalMetrics(
          inputs,
          {
            essential: outputs,
            agency: computeAgencyEquivalent ? computeAgencyEquivalent({ projectHours: inputs.projectHours, hourly: outputs?.hourly, projectNet: outputs?.projectNet }) : null,
            inacao:
              FEATURE_FLAGS.inacao_enabled && inputs.modoEstrategista && inputs.projectHours > 0 && outputs?.projectNet != null
                ? (computeStrategistMetrics
                  ? computeStrategistMetrics({
                    precoBase: outputs.projectNet,
                    valorGanhoEstimado12m: inputs.valorGanhoEstimado12m,
                    custoOportunidadeMensal: inputs.custoOportunidadeMensal,
                  })
                  : null)
                : null,
            batna:
              FEATURE_FLAGS.batna_enabled && negotiation?.runway
                ? { batnaLevel: negotiation.runway.batnaLevel, batnaMessage: negotiation.runway.batnaMessage }
                : null,
            tiers: FEATURE_FLAGS.tiers_enabled && outputs?.projectNet != null ? computeTierPricing(outputs.projectNet) : null,
          },
          FEATURE_FLAGS
        );
        const clientSafe = pickPublicExportSafe(metrics?.clientSafe || {});
        return {
          timestamp: new Date().toISOString(),
          app: "calculadora-freelancer",
          mode: ctx.mode,
          schemaVersion: metrics?.schemaVersion ?? STORAGE_SCHEMA_VERSION,
          clientSafe,
        };
      }
      function exportCsv() {
        if (!hasAcceptedTerms()) {
          showToast("Aceite os termos para exportar.");
          return;
        }
        const payload = buildExportPayload();
        const flat = {
          timestamp: payload.timestamp,
          mode: payload.mode,
          schemaVersion: payload.schemaVersion,
          ...payload.clientSafe,
        };
        const headers = Object.keys(flat);
        const values = headers.map((h) => csvEscape(flat[h]));
        const csv = `${headers.join(",")}\n${values.join(",")}\n`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `calculadora-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("CSV exportado.");
      }
      function copyTsvRow() {
        if (!hasAcceptedTerms()) {
          showToast("Aceite os termos para copiar dados.");
          return;
        }
        const payload = buildExportPayload();
        const flat = {
          timestamp: payload.timestamp,
          mode: payload.mode,
          schemaVersion: payload.schemaVersion,
          ...payload.clientSafe,
        };
        const headers = Object.keys(flat).join("\t");
        const values = Object.values(flat).map((v) => String(v ?? "")).join("\t");
        copyToClipboard(`${headers}\n${values}`, "Linha TSV copiada.");
      }
      function isValidHttpUrl(value) {
        return validateEndpointUrl ? validateEndpointUrl(value) : { ok: false, reason: "INVALID_URL" };
      }

      function endpointValidationMessage(res, label) {
        if (res && res.reason === "HTTP_EXTERNAL_BLOCKED") {
          return `URL de ${label} invÃ¡lida: use HTTPS para hosts externos. HTTP Ã© permitido apenas em localhost/127.0.0.1.`;
        }
        return `URL de ${label} invÃ¡lida.`;
      }

      function openIntegrationSettingsModal() {
        if (!els.integrationSettingsModal) return;
        const settings = loadIntegrationSettings();
        if (els.sheetsEndpointInput) els.sheetsEndpointInput.value = settings.sheetsUrl || "";
        if (els.notionEndpointInput) els.notionEndpointInput.value = settings.notionUrl || "";
        els.integrationSettingsModal.classList.remove("hidden");
        els.integrationSettingsModal.classList.add("flex");
      }

      function closeIntegrationSettingsModal() {
        if (!els.integrationSettingsModal) return;
        els.integrationSettingsModal.classList.remove("flex");
        els.integrationSettingsModal.classList.add("hidden");
      }

      function saveIntegrationSettingsFromModal() {
        const sheetsUrl = (els.sheetsEndpointInput && els.sheetsEndpointInput.value || "").trim();
        const notionUrl = (els.notionEndpointInput && els.notionEndpointInput.value || "").trim();
        const sheetsValidation = sheetsUrl ? isValidHttpUrl(sheetsUrl) : { ok: true };
        const notionValidation = notionUrl ? isValidHttpUrl(notionUrl) : { ok: true };
        if (!sheetsValidation.ok) {
          showToast(endpointValidationMessage(sheetsValidation, "Google Sheets"));
          return;
        }
        if (!notionValidation.ok) {
          showToast(endpointValidationMessage(notionValidation, "Notion"));
          return;
        }
        saveIntegrationSettings({ sheetsUrl, notionUrl });
        closeIntegrationSettingsModal();
        showToast("Endpoints salvos.");
      }

      async function sendToEndpoint(kind) {
        if (!hasAcceptedTerms()) {
          showToast("Aceite os termos para enviar dados.");
          return;
        }
        const settings = loadIntegrationSettings();
        const endpoint = kind === "sheets" ? settings.sheetsUrl : settings.notionUrl;
        if (!endpoint) {
          showToast(`Configure o endpoint de ${kind === "sheets" ? "Google Sheets" : "Notion"} primeiro.`);
          openIntegrationSettingsModal();
          return;
        }
        const validation = isValidHttpUrl(endpoint);
        if (!validation.ok) {
          if (validation.reason === "HTTP_EXTERNAL_BLOCKED") {
            showToast("Endpoint bloqueado: para host externo use HTTPS. HTTP sÃ³ Ã© permitido em localhost/127.0.0.1.");
          } else {
            showToast("Endpoint invÃ¡lido. Revise a configuraÃ§Ã£o.");
          }
          return;
        }
        const payload = buildExportPayload();
        try {
          const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            showToast(`Falha ao enviar (${resp.status}).`);
            return;
          }
          const ctx = buildPricingContext(getStateFromInputs());
          trackEvent("integration_sent", { kind, mode: ctx.mode || "essential" });
          showToast(`Enviado para ${kind === "sheets" ? "Google Sheets" : "Notion"}.`);
        } catch {
          showToast("Falha de rede ao enviar.");
        }
      }

      function setupInstallPrompt() {
        window.addEventListener("beforeinstallprompt", (e) => {
          e.preventDefault();
          deferredInstallPrompt = e;
          if (els.btnInstallApp) els.btnInstallApp.classList.remove("hidden");
          if (els.toolsInstall) els.toolsInstall.classList.remove("hidden");
        });
      }

      async function triggerAppInstall() {
        if (!deferredInstallPrompt) {
          showToast("InstalaÃ§Ã£o nÃ£o disponÃ­vel neste navegador.");
          return;
        }
        deferredInstallPrompt.prompt();
        try {
          await deferredInstallPrompt.userChoice;
        } catch {
          // ignore
        }
        deferredInstallPrompt = null;
        if (els.btnInstallApp) els.btnInstallApp.classList.add("hidden");
        if (els.toolsInstall) els.toolsInstall.classList.add("hidden");
      }

      function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("/sw.js").catch(() => {
            // keep app usable even if SW fails
          });
        });
      }

      function applyBranding() {
        document.title = BRAND_SUBTITLE;
        const metaDescription = document.getElementById("metaDescription");
        if (metaDescription) {
          metaDescription.setAttribute(
            "content",
            `${BRAND_SUBTITLE} com proposta em PDF, auditoria e governanÃ§a de dados.`
          );
        }
        const subtitleNode = document.getElementById("brandSubtitleText");
        if (subtitleNode) subtitleNode.textContent = BRAND_SUBTITLE;
        const taglineNode = document.getElementById("brandTaglineText");
        if (taglineNode) taglineNode.textContent = BRAND_TAGLINE;
        const heroHeadlineNode = document.getElementById("brandHeroHeadlineText");
        if (heroHeadlineNode) heroHeadlineNode.textContent = BRAND_HERO_HEADLINE;
        const subheadlineNode = document.getElementById("brandSubheadlineText");
        if (subheadlineNode) subheadlineNode.textContent = BRAND_SUBHEADLINE;

        const ctaMap = {
          btnExportConfig: "Exportar configuraÃ§Ã£o",
          btnImportConfig: "Importar configuraÃ§Ã£o",
          btnCopyProposal: "Copiar proposta",
          btnCopyJustification: "Copiar justificativa tÃ©cnica",
          btnInsertProposalJustification: "Usar texto com justificativa",
        };
        Object.entries(ctaMap).forEach(([id, label]) => {
          const node = document.getElementById(id);
          if (node) node.textContent = label;
        });
      }

      function applyButtonHelp() {
        const helpMap = {
          btnSaveScenarioA: "Salva as entradas e resultados atuais como CenÃ¡rio A.",
          btnSaveScenarioB: "Salva as entradas e resultados atuais como CenÃ¡rio B.",
          btnLoadScenarioA: "Carrega o CenÃ¡rio A nas entradas atuais.",
          btnLoadScenarioB: "Carrega o CenÃ¡rio B nas entradas atuais.",
          btnOpenIntegrationSettings: "Abre configuraÃ§Ã£o de endpoints para integraÃ§Ãµes.",
          btnSendSheets: "Envia os dados para o endpoint de Google Sheets configurado.",
          btnSendNotion: "Envia os dados para o endpoint de Notion configurado.",
          btnInstallApp: "Instala o app no seu dispositivo quando suportado.",
          enableMonteCarlo: "Ativa simulaÃ§Ã£o estocÃ¡stica quando houver histÃ³rico suficiente.",
          advancedMode: "Alterna entre cÃ¡lculo essencial e precificaÃ§Ã£o avanÃ§ada.",
          btnCopyJustification: "Copia os blocos de justificativa para proposta comercial.",
          btnInsertProposalJustification: "Alterna entre o texto curto e a versÃ£o com justificativa tÃ©cnica.",
        };
        Object.entries(helpMap).forEach(([id, text]) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.title = text;
          el.setAttribute("aria-label", text);
        });
      }

            function wireHelpToggles() {
        const helpButtons = Array.from(document.querySelectorAll("[data-help-target]"));
        helpButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-help-target");
            if (!targetId) return;
            const panel = document.getElementById(targetId);
            if (!panel) return;
            panel.classList.toggle("hidden");
          });
        });
      }

      function syncProposalJustificationButton() {
        if (!els.btnInsertProposalJustification) return;
        const isPinned = !!proposalJustificationPinned;
        const label = isPinned ? "Usar texto curto da proposta" : "Usar texto com justificativa";
        els.btnInsertProposalJustification.textContent = label;
        els.btnInsertProposalJustification.setAttribute("aria-pressed", String(isPinned));
      }

      const TAB_PANELS = ["panel-essential", "panel-strategist", "panel-scenario", "panel-governance"];
      const TAB_IDS = ["tab-essential", "tab-strategist", "tab-scenario", "tab-governance"];
      const TAB_MODE_LABELS = ["Essencial", "Estrategista", "ComparaÃ§Ã£o", "GovernanÃ§a"];
      const premiumLock = () => !!FEATURE_FLAGS.premium_soft_lock_enabled;
      const PREMIUM_INPUT_IDS = ["assetValue", "assetUsefulLifeMonths", "opportunityRateAnnual", "occupancyRate", "weeklyHours", "scopeVolatility", "enableMonteCarlo"];

      function setPremiumLockState(locked) {
        if (!locked) {
          if (els.premiumPreviewOverlay) els.premiumPreviewOverlay.classList.add("hidden");
          PREMIUM_INPUT_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (el) { el.disabled = false; el.removeAttribute("aria-disabled"); }
          });
        } else {
          if (els.premiumPreviewOverlay) els.premiumPreviewOverlay.classList.remove("hidden");
          PREMIUM_INPUT_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (el) { el.disabled = true; el.setAttribute("aria-disabled", "true"); }
          });
        }
      }

      function openPremiumLockModal() {
        if (els.premiumLockModal) {
          els.premiumLockModal.style.display = "flex";
          els.premiumLockModal.classList.remove("hidden");
          const firstFocusable = els.premiumLockModal.querySelector("button");
          if (firstFocusable) firstFocusable.focus();
        }
      }
      function closePremiumLockModal() {
        if (els.premiumLockModal) {
          els.premiumLockModal.style.display = "none";
          els.premiumLockModal.classList.add("hidden");
        }
      }

      const panelPremium = document.getElementById("panel-premium");

      function showPremiumPanel(asPreview) {
        TAB_PANELS.forEach((id) => {
          const p = document.getElementById(id);
          if (p) { p.classList.add("hidden"); p.setAttribute("aria-hidden", "true"); }
        });
        if (panelPremium) {
          panelPremium.classList.remove("hidden");
          panelPremium.setAttribute("aria-hidden", "false");
          panelPremium.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setPremiumLockState(!!asPreview);
      }

      function hidePremiumPanel(restoreTabFn) {
        if (panelPremium) {
          panelPremium.classList.add("hidden");
          panelPremium.setAttribute("aria-hidden", "true");
        }
        setPremiumLockState(false);
        const selectedTab = document.querySelector('[role="tablist"] [aria-selected="true"]');
        const idx = selectedTab ? TAB_IDS.indexOf(selectedTab.id) : 0;
        if (typeof restoreTabFn === "function") restoreTabFn(idx >= 0 ? idx : 0);
      }

      function setupTabs() {
        const tablist = document.querySelector('[role="tablist"]');
        if (!tablist) return;
        const tabs = TAB_IDS.map((id) => document.getElementById(id)).filter(Boolean);
        const panels = TAB_PANELS.map((id) => document.getElementById(id)).filter(Boolean);

        function applyTabStyles(tabsArr, selectedIndex) {
          tabsArr.forEach((t, i) => {
            if (!t) return;
            const selected = i === selectedIndex;
            t.classList.remove("bg-indigo-500/20", "ring-1", "ring-white/10", "bg-white/5", "text-slate-400", "border-transparent");
            if (selected) {
              t.classList.add("bg-indigo-500/20", "ring-1", "ring-white/10", "text-white");
            } else {
              t.classList.add("bg-white/5", "text-slate-400", "border-transparent");
            }
          });
        }

        function activateTab(index, fromClick, skipToast) {
          if (panelPremium) {
            panelPremium.classList.add("hidden");
            panelPremium.setAttribute("aria-hidden", "true");
          }
          setPremiumLockState(false);

          tabs.forEach((t, i) => {
            const selected = i === index;
            if (t) {
              t.setAttribute("aria-selected", String(selected));
              t.setAttribute("tabindex", selected ? "0" : "-1");
            }
          });
          applyTabStyles(tabs, index);

          panels.forEach((p, i) => {
            const show = i === index;
            if (p) {
              if (show) {
                p.classList.remove("hidden", "tab-panel-enter");
                p.classList.add("tab-panel-visible");
                animatePanelEntrance(p);
                if (fromClick) showTabSkeleton(p);
              } else {
                p.classList.add("hidden");
                p.classList.remove("tab-panel-visible");
              }
              p.setAttribute("aria-hidden", String(!show));
            }
          });

          if (els.activeModeLabel) els.activeModeLabel.textContent = "Modo ativo: " + TAB_MODE_LABELS[index];
          if (!skipToast) showToast(TAB_MODE_LABELS[index] + " ativado");
        }

        tabs.forEach((tab, index) => {
          if (!tab) return;
          tab.addEventListener("click", () => {
            activateTab(index, true);
          });
          tab.addEventListener("keydown", (e) => {
            const visibleIndices = tabs.map((t, i) => (t && !t.classList.contains("hidden") ? i : -1)).filter((i) => i >= 0);
            let nextIdx = visibleIndices.indexOf(index);
            let next = index;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              nextIdx = Math.min(nextIdx + 1, visibleIndices.length - 1);
              next = visibleIndices[nextIdx] ?? index;
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              nextIdx = Math.max(nextIdx - 1, 0);
              next = visibleIndices[nextIdx] ?? index;
            } else if (e.key === "Home") {
              e.preventDefault();
              next = visibleIndices[0] ?? index;
            } else if (e.key === "End") {
              e.preventDefault();
              next = visibleIndices[visibleIndices.length - 1] ?? index;
            } else return;
            if (next !== index && tabs[next]) {
              activateTab(next, true);
              tabs[next].focus();
            }
          });
        });

        if (els.btnPremiumClose) els.btnPremiumClose.addEventListener("click", closePremiumLockModal);
        if (els.btnPremiumLista) els.btnPremiumLista.addEventListener("click", () => { showToast("Em breve."); closePremiumLockModal(); });
        if (els.btnPremiumQuero) els.btnPremiumQuero.addEventListener("click", () => { showToast("Em breve."); closePremiumLockModal(); });
        if (els.btnPremiumVerPrevia) {
          els.btnPremiumVerPrevia.addEventListener("click", () => {
            closePremiumLockModal();
            showPremiumPanel(true);
          });
        }
        if (els.btnPremiumVoltar) {
          els.btnPremiumVoltar.addEventListener("click", () => {
            hidePremiumPanel((idx) => activateTab(idx, false, true));
          });
        }
        if (els.btnPremiumOffer) {
          els.btnPremiumOffer.addEventListener("click", () => {
            if (premiumLock()) {
              openPremiumLockModal();
            } else {
              showPremiumPanel(false);
              if (els.activeModeLabel) els.activeModeLabel.textContent = "Modo ativo: Premium";
            }
          });
        }
        if (premiumLock() && els.btnPremiumOffer) {
          els.btnPremiumOffer.textContent = "Conhecer Premium ðŸ”’";
        } else if (!premiumLock() && els.btnPremiumOffer) {
          els.btnPremiumOffer.textContent = "Premium";
        }
        if (els.premiumLockModal) {
          els.premiumLockModal.addEventListener("click", (e) => { if (e.target === els.premiumLockModal) closePremiumLockModal(); });
          document.addEventListener("keydown", (e) => { if (e.key === "Escape" && els.premiumLockModal && !els.premiumLockModal.classList.contains("hidden")) closePremiumLockModal(); });
        }

        activateTab(0, false, true);
      }

      let wizardCurrentStep = 1;
      function setupWizard() {
        const container = els.wizardContainer;
        if (!container) return;
        const enabled = !!FEATURE_FLAGS.ui_wizard_enabled;
        container.setAttribute("data-wizard-enabled", enabled ? "true" : "false");
        if (!enabled) return;
        const steps = [els.wizardStep1, els.wizardStep2, els.wizardStep3].filter(Boolean);
        function goToStep(step) {
          wizardCurrentStep = Math.max(1, Math.min(3, step));
          steps.forEach((s, i) => {
            if (!s) return;
            const isCurrent = i + 1 === wizardCurrentStep;
            s.classList.toggle("hidden", !isCurrent);
            s.setAttribute("data-current", String(isCurrent));
          });
          if (els.wizardStepIndicator) els.wizardStepIndicator.textContent = "Passo " + wizardCurrentStep + " de 3";
          if (els.btnWizardPrev) els.btnWizardPrev.classList.toggle("hidden", wizardCurrentStep <= 1);
          if (els.btnWizardNext) els.btnWizardNext.classList.toggle("hidden", wizardCurrentStep >= 3);
        }
        if (els.btnWizardNext) {
          els.btnWizardNext.addEventListener("click", () => {
            const s = getStateFromInputs();
            const r = buildPricingContext(s).effective;
            if (wizardCurrentStep < 3 && !r.ok && wizardCurrentStep === 1) {
              showToast("Faltam campos para cÃ¡lculo completo. AvanÃ§ar mesmo assim.");
            }
            goToStep(wizardCurrentStep + 1);
          });
        }
        if (els.btnWizardPrev) {
          els.btnWizardPrev.addEventListener("click", () => goToStep(wizardCurrentStep - 1));
        }
        if (els.btnWizardAdvanced) {
          els.btnWizardAdvanced.addEventListener("click", (e) => {
            e.preventDefault();
            const tablist = document.querySelector('[role="tablist"]');
            if (tablist) tablist.scrollIntoView({ behavior: "smooth" });
          });
        }
        if (els.btnWizardBottomPdf) {
          els.btnWizardBottomPdf.addEventListener("click", () => {
            if (typeof generatePdf === "function") generatePdf();
          });
        }
        goToStep(1);
      }

      function setupPreviewAnchor() {
        const enabled = !!FEATURE_FLAGS.ui_preview_anchor_enabled;
        if (els.resultCardsInternal) {
          els.resultCardsInternal.setAttribute("data-anchor-enabled", enabled ? "true" : "false");
        }
        if (els.resultCardProposal) {
          els.resultCardProposal.setAttribute("data-anchor-enabled", enabled ? "true" : "false");
        }
        if (els.resultCardsCtaBlock) {
          els.resultCardsCtaBlock.classList.toggle("hidden", !enabled);
        }
      }

      function setupTrustBadges() {
        const enabled = !!FEATURE_FLAGS.ui_trust_badges_enabled;
        if (els.trustBadgesBlock) {
          els.trustBadgesBlock.classList.toggle("hidden", !enabled);
        }
      }

      function setupMicroInteractions() {
        const enabled = !!FEATURE_FLAGS.ui_micro_interactions_enabled;
        const root = document.documentElement;
        root.classList.toggle("micro-interactions-on", enabled);
        if (els.wizardContainer) els.wizardContainer.classList.toggle("micro-interactions-on", enabled);
        if (!enabled) return;
        const numInputs = ["targetIncome", "monthlyCosts", "taxRate", "profitMargin", "buffer", "utilization", "hoursPerDay", "daysPerWeek", "vacationWeeks", "projectHours", "scopeRisk", "discount", "monthlyVolumeHours"];
        numInputs.forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.addEventListener("blur", () => {
            const v = el.value;
            const min = parseFloat(el.getAttribute("min")) ?? -Infinity;
            const max = parseFloat(el.getAttribute("max")) ?? Infinity;
            const n = parseFloat(v);
            el.classList.remove("input-validation-valid", "input-validation-invalid");
            if (v === "" || isNaN(n)) return;
            if (n >= min && n <= max) el.classList.add("input-validation-valid");
            else el.classList.add("input-validation-invalid");
          });
        });
        const steps = [els.wizardStep1, els.wizardStep2, els.wizardStep3].filter(Boolean);
        steps.forEach((s) => s && s.classList.add("micro-transition-step"));
      }

      function setupMobileA11y() {
        const enabled = !!FEATURE_FLAGS.ui_mobile_a11y_enabled;
        document.documentElement.classList.toggle("mobile-a11y-on", enabled);
        const touchButtons = [els.btnPrimaryPdfHeader, els.btnPdfProposal, els.btnPdfFromPreview, els.btnWizardBottomPdf, els.btnMobileA11yPdf, els.btnToolsToggle].filter(Boolean);
        touchButtons.forEach((btn) => btn && btn.classList.toggle("mobile-a11y-touch", enabled));
        if (!enabled && els.mobileA11yBar) {
          els.mobileA11yBar.classList.add("hidden");
          document.body.classList.remove("mobile-a11y-bar-visible");
        }
        const hasMobileBar = FEATURE_FLAGS.ui_mobile_a11y_enabled || FEATURE_FLAGS.ui_wizard_enabled;
        if (hasMobileBar) {
          const isInputLike = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
          document.addEventListener("focusin", (e) => {
            if (isInputLike(e.target)) document.body.classList.add("input-focused");
          });
          document.addEventListener("focusout", (e) => {
            if (isInputLike(e.target) && !isInputLike(e.relatedTarget)) document.body.classList.remove("input-focused");
          });
        }
      }

      function getAdvancedWarningsBundle(s, essential, advanced) {
        const warnings = [];
        if (!advanced || !advanced.ok) return warnings;
        const patrimonialHourly = (advanced.data.depreciationMonthly + advanced.data.opportunityCostMonthly) / Math.max(essential.billableHours || 1, 1);
        if ((advanced.output.hourly || 0) <= patrimonialHourly) {
          warnings.push("Erosao patrimonial: o preco/hora nao cobre o peso de depreciacao e oportunidade.");
        }
        if ((advanced.data.exhaustionFactor || 1) > 1.1) {
          warnings.push("Risco de burnout: fator de exaustao acima do nivel recomendado.");
        }
        if ((advanced.data.scarcityFactor || 1) > 1.08) {
          warnings.push("Escassez favoravel: ocupacao atual justifica markup premium.");
        }
        return warnings;
      }

      function buildPricingContext(s) {
        const essential = compute(s);
        if (!s.advancedMode || !computeAdvancedPricing) {
          return { mode: "essential", effective: essential, essential, advanced: null, warning: "" };
        }
        if (!essential.ok) {
          return { mode: "advanced_fallback", effective: essential, essential, advanced: null, warning: "Modo Avancado indisponivel ate corrigir os dados essenciais." };
        }
        const history = deriveHistoricalVarianceSamples(getAuditTrail ? getAuditTrail() : []);
        const advanced = computeAdvancedPricing({
          state: s,
          essential,
          useMonteCarlo: !!s.enableMonteCarlo,
          historicalSamples: history,
        });
        if (!advanced.ok || !advanced.output || !advanced.output.ok) {
          return {
            mode: "advanced_fallback",
            effective: essential,
            essential,
            advanced: null,
            warning: (advanced && advanced.error && advanced.error.message) || "Modo Avancado invalido. Retornamos para o Modo Essencial.",
          };
        }
        return { mode: "advanced", effective: advanced.output, essential, advanced, warning: "" };
      }

      function formatScopeLevel(level) {
        if (level === "high") return "alto";
        if (level === "medium") return "mÃ©dio";
        return "baixo";
      }

      function buildNegotiationContext(s, r) {
        const scopeShield = computeScopeShielding({
          historicoMuitasAlteracoes: !!s.riskHistoricoAlteracoes,
          comunicacaoFragmentada: !!s.riskComunicacaoFragmentada,
          tomadorIndefinido: !!s.riskTomadorIndefinido,
          escopoIncompleto: !!s.riskEscopoIncompleto,
          urgenciaSemBriefing: !!s.riskUrgenciaSemBriefing,
        });
        const scarcity = computeDynamicScarcityMarkup(s.ocupacaoAgenda);
        const roi = computeRoiAnchor({
          impactoNoNegocio: s.impactoNoNegocio,
          areaImpacto: s.areaImpacto,
        });
        const runway = computeRunwaySummary({
          reservaMetaMeses: s.reservaMetaMeses,
          reservaAtual: s.reservaAtual,
          custoPessoalMensal: s.custoPessoalMensal,
          targetIncome: s.targetIncome,
          monthlyCosts: s.monthlyCosts,
          projectNet: r.projectNet,
        });
        const justification = generateJustificationBlocks({
          state: s,
          scopeShield,
          scarcity,
          roi,
        });
        const projectNet = Number(r.projectNet || 0);
        const shieldImpact = projectNet * (scopeShield.markupPct / 100);
        const scarcityImpact = projectNet * (scarcity.markupPct / 100);
        return {
          scopeShield,
          scarcity,
          roi,
          runway,
          justification,
          shieldImpact,
          scarcityImpact,
        };
      }

      function renderNegotiationOutputs(s, r, n) {
        if (!els.justificationExecutive || !els.justificationTechnical || !els.scopeShieldSummary || !els.scarcitySummary || !els.runwaySummary) return;
        const curr = sanitizeCurrency(s.currency);
        safeText(els.justificationExecutive, n.justification.resumoExecutivo || "â€”");
        safeText(els.justificationTechnical, n.justification.justificativaTecnica || "â€”");
        if (els.justificationPriorityWrap && els.justificationPriority) {
          const hasPriority = !!n.justification.justificativaPrioridadeRisco;
          els.justificationPriorityWrap.classList.toggle("hidden", !hasPriority);
          safeText(els.justificationPriority, hasPriority ? n.justification.justificativaPrioridadeRisco : "â€”");
        }
        if (els.roiAnchorLine) {
          const text = n.roi.enabled ? `${n.roi.text} ${n.roi.caveat}` : "";
          els.roiAnchorLine.classList.toggle("hidden", !text);
          safeText(els.roiAnchorLine, text);
        }
        safeText(
          els.scopeShieldSummary,
          `Taxa de GestÃ£o de Expectativa: ${fmtNumber(n.scopeShield.markupPct, 1)}% (${formatScopeLevel(n.scopeShield.level)}). Impacto estimado: ${fmtMoney(Math.max(0, n.shieldImpact), curr)}.`
        );
        safeText(
          els.scarcitySummary,
          `PrÃªmio de conveniÃªncia aplicado: ${fmtNumber(n.scarcity.markupPct, 1)}% (ocupaÃ§Ã£o ${fmtNumber(s.ocupacaoAgenda, 0)}%). Impacto estimado: ${fmtMoney(Math.max(0, n.scarcityImpact), curr)}.`
        );
        const fonte = n.runway.custoFonte === "explicito"
          ? `Custo pessoal mensal explÃ­cito: ${fmtMoney(n.runway.custoPessoalMensal, curr)}.`
          : `Custo pessoal mensal derivado (renda + custos): ${fmtMoney(n.runway.custoPessoalMensal, curr)}.`;
        const projetosTexto = n.runway.projetosNecessarios == null
          ? "Projetos necessÃ¡rios para meta: informe um projeto com valor lÃ­quido positivo."
          : `Projetos necessÃ¡rios para meta de reserva: ${fmtNumber(n.runway.projetosNecessarios, 0)}.`;
        safeText(
          els.runwaySummary,
          `FÃ´lego financeiro atual: ${fmtNumber(n.runway.runwayMesesAtual, 1)} meses (${fmtNumber(n.runway.runwayDiasAtual, 0)} dias). ` +
            `FÃ´lego financeiro pÃ³s-projeto: ${fmtNumber(n.runway.runwayMesesPosProjeto, 1)} meses (${fmtNumber(n.runway.runwayDiasPosProjeto, 0)} dias). ` +
            `${projetosTexto} ${fonte} ${n.runway.caveat}`
        );
        if (els.antiDiscountList) {
          const anti = getAntiDiscountPhrases(s, n);
          els.antiDiscountList.textContent = "";
          for (const p of anti) {
            const li = createEl("li", "", p);
            els.antiDiscountList.appendChild(li);
          }
        }
      }

      function buildJustificationClipboardText(s, n) {
        const parts = [
          n.justification.resumoExecutivo,
          n.justification.justificativaTecnica,
        ];
        if (n.justification.justificativaPrioridadeRisco) parts.push(n.justification.justificativaPrioridadeRisco);
        if (n.roi.enabled && n.roi.text) parts.push(n.roi.text);
        parts.push(n.justification.caveat || "Estimativa sujeita Ã  execuÃ§Ã£o e variÃ¡veis operacionais.");
        return parts.filter(Boolean).join("\n\n");
      }

      function getAntiDiscountPhrases(s, n) {
        const phrases = [...NEGOTIATION_PHRASES];
        if (n && n.roi && n.roi.enabled && n.roi.text) {
          phrases.unshift(`${n.roi.text} ${n.roi.caveat}`);
        }
        return phrases.slice(0, 8);
      }

      function renderExplainability(s, ctx) {
        if (!els.explainabilityCard || !els.explainabilityList || !els.advancedWarnings || !els.advancedModelLabel) return;
        const isAdvanced = s.advancedMode && ctx.mode === "advanced" && ctx.advanced;
        els.explainabilityCard.classList.toggle("hidden", !isAdvanced);
        if (!isAdvanced) return;
        const a = ctx.advanced;
        const curr = sanitizeCurrency(s.currency);
        const baseRef = Math.max(a.data.baseHourly, 0.0001);
        const rows = [
          ["Patrimonio (depreciacao + oportunidade)", a.data.contributions.patrimonio, "Cobertura do desgaste dos ativos e custo de capital."],
          ["Risco de escopo", a.data.contributions.risco, "Ajuste de incerteza do escopo (volatilidade)."],
          ["Escassez de agenda", a.data.contributions.escassez, "Ajuste por ocupacao e capacidade limitada."],
          ["Exaustao operacional", a.data.contributions.exaustao, "Compensacao por carga semanal elevada."],
        ];
        els.explainabilityList.textContent = "";
        for (const [label, val, text] of rows) {
          const value = Number(val || 0);
          const pct = (Math.abs(value) / baseRef) * 100;
          const signal = value >= 0 ? "+" : "-";
          const div = createEl("div", "rounded-lg border border-white/10 bg-black/20 px-3 py-2");
          div.appendChild(createEl("p", "font-medium", label));
          div.appendChild(createEl("p", "text-indigo-100", `${signal}${fmtMoney(Math.abs(value), curr)} Â· ${fmtNumber(pct, 1)}%`));
          div.appendChild(createEl("p", "text-slate-300", text));
          els.explainabilityList.appendChild(div);
        }
        if (a.mode === "montecarlo" && a.stochastic) {
          els.advancedModelLabel.textContent = `Modelo: Monte Carlo (P50 ${fmtNumber(a.stochastic.p50, 2)}x Â· P80 ${fmtNumber(a.stochastic.p80, 2)}x Â· P95 ${fmtNumber(a.stochastic.p95, 2)}x)`;
          if (els.premiumModeTag) els.premiumModeTag.textContent = "Premium + Monte Carlo";
        } else {
          els.advancedModelLabel.textContent = "Modelo: estimativa por faixa (deterministico)";
          if (els.premiumModeTag) els.premiumModeTag.textContent = "Premium Deterministico";
        }
        const warns = getAdvancedWarningsBundle(s, ctx.essential, ctx.advanced);
        els.advancedWarnings.textContent = "";
        if (warns.length) {
          for (const w of warns) {
            els.advancedWarnings.appendChild(createEl("div", "rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-amber-100", w));
          }
        } else {
          els.advancedWarnings.appendChild(createEl("div", "rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-emerald-100", "Sem alertas criticos no modo avancado."));
        }
      }

      function renderRiskAudit(s, ctx) {
        if (!FEATURE_FLAGS.risk_score_enabled) {
          if (els.auditModeCard) els.auditModeCard.classList.add("hidden");
          return;
        }
        if (!els.auditModeCard || !els.riskScoreValue || !els.riskScoreNarrative || !els.riskScoreBreakdown || !els.exhaustionBadgeLabel || !els.exhaustionBadgeImpact) return;
        const isAdvanced = s.advancedMode && ctx.mode === "advanced" && ctx.advanced;
        els.auditModeCard.classList.toggle("hidden", !isAdvanced);
        if (!isAdvanced) {
          riskTelemetryState = null;
          return;
        }
        const risk = computeRiskScore({
          scopeFactor: ctx.advanced.data.scopeFactor,
          occupancyRate: s.occupancyRate,
          exhaustionFactor: ctx.advanced.data.exhaustionFactor,
          denominator: ctx.advanced.data.denominator,
        });
        els.riskScoreValue.textContent = `${fmtNumber(risk.score, 1)} / 100`;
        els.riskScoreNarrative.textContent = riskNarrative(risk);
        els.riskScoreBreakdown.textContent =
          `Escopo ${fmtNumber(risk.subscores.riscoEscopo, 1)} Â· OcupaÃ§Ã£o ${fmtNumber(risk.subscores.ocupacaoPressao, 1)} Â· ExaustÃ£o ${fmtNumber(risk.subscores.exaustaoPressao, 1)} Â· Margem ${fmtNumber(risk.subscores.margemFragilidade, 1)}`;

        const exFactor = ctx.advanced.data.exhaustionFactor || 1;
        const exImpact = ctx.advanced.data.contributions.exaustao || 0;
        if (exFactor > 1.0) {
          els.exhaustionBadgeLabel.textContent = "Taxa de preservaÃ§Ã£o de saÃºde aplicada";
          const pct = ((exFactor - 1) * 100);
          els.exhaustionBadgeImpact.textContent = `${fmtMoney(Math.abs(exImpact), s.currency)} Â· ${fmtNumber(pct, 1)}%`;
        } else {
          els.exhaustionBadgeLabel.textContent = "Sem ajuste de exaustÃ£o";
          els.exhaustionBadgeImpact.textContent = "Impacto: 0";
        }
        const telemetryDecision = shouldTrackRiskScoreView
          ? shouldTrackRiskScoreView({
              prev: riskTelemetryState,
              score: risk.score,
              mode: ctx.mode || "advanced",
              model: ctx.advanced.mode || "deterministic",
              nowMs: Date.now(),
              threshold: 1.0,
              cooldownMs: 10_000,
            })
          : { shouldTrack: true, next: null };
        if (telemetryDecision && telemetryDecision.next) {
          riskTelemetryState = telemetryDecision.next;
        }
        if (telemetryDecision && telemetryDecision.shouldTrack) {
          trackEvent("risk_score_view", { score: risk.score, model: ctx.advanced.mode || "deterministic" });
        }
      }

      function scheduleAuditSnapshot() {
        clearTimeout(auditDebounceTimer);
        auditDebounceTimer = setTimeout(() => {
          const s = getStateFromInputs();
          const r = buildPricingContext(s).effective;
          if (!r.ok || !hasAcceptedTerms()) return;
          const snapshot = {
            inputs: { ...s },
            outputs: {
              revenueTarget: r.revenueTarget,
              hourly: r.hourly,
              daily: r.daily,
              projectGross: r.projectGross,
              projectNet: r.projectNet,
            },
          };
          const str = JSON.stringify(snapshot);
          if (str !== lastAuditSnapshotStr) {
            appendAuditSnapshot(snapshot);
            lastAuditSnapshotStr = str;
          }
        }, AUDIT_DEBOUNCE_MS);
      }

      function updateUI() {
        let s = getStateFromInputs();
        const canonicalUiMode = getCanonicalUiMode(s.uiMode);
        if (canonicalUiMode !== currentUiMode) {
          currentUiMode = canonicalUiMode;
          s = { ...s, uiMode: currentUiMode };
        }
        if (typeof resolveUiModeTabIndex === "function" && typeof activateUiModeTab === "function") {
          const safeIdx = resolveUiModeTabIndex(currentUiMode);
          activateUiModeTab(safeIdx, { persist: false });
        }
        const pricingCtx = buildPricingContext(s);
        const r = pricingCtx.effective;
        const negotiationCtx = buildNegotiationContext(s, r);

        // normalize inputs (clamp) â€” only when elements exist
        if (els.taxRate) els.taxRate.value = s.taxRate;
        if (els.profitMargin) els.profitMargin.value = s.profitMargin;
        if (els.buffer) els.buffer.value = s.buffer;
        if (els.utilization) els.utilization.value = s.utilization;
        if (els.hoursPerDay) els.hoursPerDay.value = s.hoursPerDay;
        if (els.daysPerWeek) els.daysPerWeek.value = s.daysPerWeek;
        if (els.vacationWeeks) els.vacationWeeks.value = s.vacationWeeks;
        if (els.scopeRisk) els.scopeRisk.value = s.scopeRisk;
        if (els.discount) els.discount.value = s.discount;
        if (els.assetValue) els.assetValue.value = s.assetValue;
        if (els.assetUsefulLifeMonths) els.assetUsefulLifeMonths.value = s.assetUsefulLifeMonths;
        if (els.opportunityRateAnnual) els.opportunityRateAnnual.value = s.opportunityRateAnnual;
        if (els.occupancyRate) els.occupancyRate.value = s.occupancyRate;
        if (els.weeklyHours) els.weeklyHours.value = s.weeklyHours;
        if (els.ocupacaoAgenda) els.ocupacaoAgenda.value = s.ocupacaoAgenda;
        if (els.reservaMetaMeses) els.reservaMetaMeses.value = s.reservaMetaMeses;
        if (els.reservaAtual) els.reservaAtual.value = s.reservaAtual;
        if (els.custoPessoalMensal) els.custoPessoalMensal.value = s.custoPessoalMensal;

        const curr = s.currency;
        const pricingEngineV1Vm = buildPricingUiV1ViewModel(s);
        renderPricingEngineV1Card(s, pricingEngineV1Vm);
        if (els.resultError) {
          if (pricingCtx.warning) {
            els.resultError.textContent = pricingCtx.warning;
            els.resultError.classList.remove("hidden");
          } else if (!r.ok && r.error) {
            els.resultError.textContent = r.error.message;
            els.resultError.classList.remove("hidden");
          } else {
            els.resultError.classList.add("hidden");
            els.resultError.textContent = "";
          }
        }

        const hourlyOk = r.ok && r.hourly != null;
        if (FEATURE_FLAGS.ui_counter_up_enabled) {
          animateMoneyCounter(els.hourlyRate, hourlyOk ? r.hourly : null, curr);
        } else {
          safeMoney(els.hourlyRate, hourlyOk ? fmtMoney(r.hourly, curr) : "â€”");
        }
        safeText(els.dailyRate, hourlyOk ? fmtMoney(r.daily, curr) : "â€”");
        safeText(els.hourlyNote, s.advancedMode ? "Baseada na estratÃ©gia premium (patrimÃ´nio, risco, escassez e exaustÃ£o)." : "Baseada na sua capacidade faturÃ¡vel.");
        if (els.dailyLabel) {
          safeText(els.dailyLabel, `Taxa/dia (${fmtNumber(s.hoursPerDay, 1)}h)`);
        }
        safeText(
          els.billableHours,
          r.billableHours != null ? `${fmtNumber(r.billableHours, 1)} h` : "â€”"
        );

        safeMoney(els.revenueTarget, r.ok && r.revenueTarget != null ? fmtMoney(r.revenueTarget, curr) : "â€”");
        safeText(
          els.revenueBreakdown,
          `Base: ${fmtMoney(r.baseNeed, curr)} â€¢ Total: ${fmtNumber(s.taxRate, 1)}% + ${fmtNumber(
            s.profitMargin,
            1
          )}% + ${fmtNumber(s.buffer, 1)}% = ${fmtNumber(r.totalPercent, 1)}%`
        );

        safeText(els.stepCost, `${fmtMoney(s.targetIncome, curr)} + ${fmtMoney(s.monthlyCosts, curr)} = ${fmtMoney(r.baseNeed, curr)}`);

        safeText(
          els.stepTax,
          `${fmtNumber(s.taxRate, 1)}% + ${fmtNumber(s.profitMargin, 1)}% + ${fmtNumber(s.buffer, 1)}% = ${fmtNumber(r.totalPercent, 1)}%`
        );

        if (!r.ok && r.error) {
          safeText(els.stepProfit, r.error.message);
        } else if (r.ok && r.revenueTarget != null) {
          safeText(
            els.stepProfit,
            `${fmtMoney(r.baseNeed, curr)} Ã· (1 âˆ’ ${fmtNumber(r.totalPercent, 1)}%) = ${fmtMoney(r.revenueTarget, curr)}`
          );
        } else {
          safeText(els.stepProfit, "â€”");
        }

        safeText(
          els.stepHours,
          `Semanas Ãºteis/ano: ${fmtNumber(r.workingWeeks, 1)} â€¢ Horas/mÃªs: ${fmtNumber(r.hoursPerMonth, 1)} â€¢ FaturÃ¡veis: ${fmtNumber(
            r.billableHours,
            1
          )}`
        );

        // Projeto
        const projectOk = hourlyOk && s.projectHours > 0 && r.ok && r.projectNet != null;
        if (FEATURE_FLAGS.ui_counter_up_enabled) {
          animateMoneyCounter(els.projectPrice, projectOk ? r.projectNet : null, curr);
        } else {
          safeMoney(els.projectPrice, projectOk ? fmtMoney(r.projectNet, curr) : "â€”");
        }
        if (els.projectHint) {
          if (s.proposalMode) {
            safeText(els.projectHint, "");
            els.projectHint.classList.add("hidden");
          } else {
            els.projectHint.classList.remove("hidden");
            safeText(
              els.projectHint,
              projectOk
                ? `(${fmtNumber(s.projectHours, 0)}h Ã— taxa/hora) com +${fmtNumber(s.scopeRisk, 1)}% margem de escopo e âˆ’${fmtNumber(s.discount, 1)}% desconto.`
                : "Preencha as horas para estimar."
            );
          }
        }

        let proposalBaseText = "â€”";
        if (projectOk) {
          const prazoDiasUteis = Math.ceil((s.projectHours / Math.max(1, s.hoursPerDay)) * (100 / s.utilization));
          const roiLine = negotiationCtx.roi.enabled ? ` ${negotiationCtx.roi.text}` : "";
          const anti = getAntiDiscountPhrases(s, negotiationCtx)[0] || "";
          proposalBaseText = `Proposta comercial para execuÃ§Ã£o do projeto conforme escopo e premissas acordadas. Investimento: ${fmtMoney(r.projectNet, curr)}. Prazo estimado: ~${fmtNumber(prazoDiasUteis, 0)} dias Ãºteis.${roiLine} ${anti} ${negotiationCtx.roi.caveat}`;
        }
        let proposalFinalText = proposalBaseText;
        if (proposalJustificationPinned && proposalBaseText !== "â€”") {
          const payload = String(buildJustificationClipboardText(s, negotiationCtx) || "").trim();
          if (payload) proposalFinalText = payload;
        }
        safeText(els.proposalText, proposalFinalText);

        renderComposition(s, r, pricingCtx);
        renderAlerts(s, r);
        renderScenariosComparison();
        renderExplainability(s, pricingCtx);
        renderRiskAudit(s, pricingCtx);
        updateRiskThermometer(s);
        renderNegotiationOutputs(s, r, negotiationCtx);

        const strategistEnabled = !!FEATURE_FLAGS.strategist_mode_enabled;
        const strategistActive = strategistEnabled && !!s.modoEstrategista;
        const accordionStrategist = document.querySelector(".strategist-accordion-btn");
        if (accordionStrategist) accordionStrategist.classList.toggle("hidden", !strategistEnabled);
        if (els.strategistInputsWrap) els.strategistInputsWrap.classList.toggle("hidden", !strategistActive);
        if (els.strategistInputsWrap) els.strategistInputsWrap.classList.toggle("grid", strategistActive);
        if (els.strategistResultsCard) els.strategistResultsCard.classList.toggle("hidden", !strategistActive);
        if (strategistActive && computeStrategistMetrics && formatStrategistValue) {
          const precoBase = s.projectHours > 0 && r.ok && r.projectNet != null ? r.projectNet : null;
          const strat = computeStrategistMetrics({
            precoBase,
            valorGanhoEstimado12m: s.valorGanhoEstimado12m,
            custoOportunidadeMensal: s.custoOportunidadeMensal,
          });
          const noPreco = precoBase == null || precoBase <= 0;
          safeText(els.strategistVce, noPreco ? "â€”" : formatStrategistValue(strat.vce, "percent"));
          safeText(els.strategistVceLabel, noPreco ? "Preencha horas do projeto." : (strat.vceLabel || "â€”"));
          safeText(els.strategistRoix, noPreco ? "â€”" : (strat.roix != null ? `${fmtNumber(strat.roix, 1)}x` : "â€”"));
          safeText(els.strategistCdo, noPreco ? "â€”" : (strat.cdo != null ? fmtMoney(strat.cdo, curr) : "â€”"));
          if (els.strategistViabilidadeAlerta) {
            els.strategistViabilidadeAlerta.classList.toggle("hidden", !strat.viabilidadeAlerta);
          }
        }

        persistState(s);

        if (els.configWrapper) {
          els.configWrapper.classList.toggle("hidden", !!s.proposalMode);
        }
        if (els.wizardContainer && FEATURE_FLAGS.ui_wizard_enabled) {
          els.wizardContainer.classList.toggle("hidden", !!s.proposalMode);
        }
        if (els.advancedConfigCard) {
          els.advancedConfigCard.classList.toggle("hidden", !s.advancedMode);
        }
        if (els.advancedTeaserCard) {
          els.advancedTeaserCard.classList.toggle("hidden", !!s.advancedMode);
        }
        if (els.calcCard) {
          if (s.proposalMode) {
            if (!calcCardStash && els.calcCard.parentNode) {
              const parent = els.calcCard.parentNode;
              const nextSibling = els.calcCard.nextSibling;
              parent.removeChild(els.calcCard);
              calcCardStash = { node: els.calcCard, parent, nextSibling };
            }
          } else {
            if (calcCardStash) {
              calcCardStash.parent.insertBefore(calcCardStash.node, calcCardStash.nextSibling);
              calcCardStash = null;
            }
          }
        }

        if (els.resultCardsInternal) {
          els.resultCardsInternal.classList.toggle("hidden", !!s.proposalMode);
        }
        if (els.resultCardProposal) {
          els.resultCardProposal.classList.toggle("hidden", !s.proposalMode);
        }
        if (s.proposalMode && els.resultProposalTotal && els.resultProposalPrazo) {
          const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
          safeMoney(els.resultProposalTotal, projectOk ? fmtMoney(r.projectNet, s.currency) : "â€”");
          const prazoDias = Math.ceil((s.projectHours / Math.max(1, s.hoursPerDay)) * (100 / Math.max(1, s.utilization)));
          safeText(els.resultProposalPrazo, projectOk ? `~${fmtNumber(prazoDias, 0)} dias Ãºteis` : "â€”");
        }
        if (els.proposalValorGanhoBlock && els.resultProposalValorGanho) {
          if (FEATURE_FLAGS.ui_preview_anchor_enabled) {
            const hasValorGanho = !!s.modoEstrategista && s.valorGanhoEstimado12m > 0;
            els.proposalValorGanhoBlock.classList.remove("hidden");
            safeText(els.resultProposalValorGanho, hasValorGanho ? fmtMoney(s.valorGanhoEstimado12m, s.currency) : "Preencha dados estratÃ©gicos para estimar.");
          } else {
            els.proposalValorGanhoBlock.classList.add("hidden");
          }
        }

        if (r.ok && hasAcceptedTerms()) {
          scheduleAuditSnapshot();
        }

        const calcOk = r.ok;
        const errMsg = r.error ? r.error.message : "";
        const termsOk = hasAcceptedTerms();
        const pdfOk = s.proposalMode
          ? (r.ok && s.projectHours > 0 && r.projectNet != null)
          : calcOk;
        if (els.btnPdf) {
          els.btnPdf.disabled = !pdfOk;
          els.btnPdf.title = pdfOk ? "" : (errMsg || "Preencha os dados para gerar o PDF.");
        }
        if (els.btnPdfProposal) {
          els.btnPdfProposal.disabled = els.btnPdf ? els.btnPdf.disabled : true;
          els.btnPdfProposal.title = els.btnPdf ? els.btnPdf.title : (errMsg || "Preencha os dados para gerar o PDF.");
        }
        if (els.btnPdfFromPreview) {
          els.btnPdfFromPreview.disabled = !pdfOk || !termsOk;
          els.btnPdfFromPreview.title = (pdfOk && termsOk) ? "" : (errMsg || "Preencha os dados para gerar o PDF.");
        }
        if (els.btnPrimaryPdfHeader) {
          els.btnPrimaryPdfHeader.disabled = !pdfOk || !termsOk;
          els.btnPrimaryPdfHeader.style.pointerEvents = (!pdfOk || !termsOk) ? "none" : "";
          els.btnPrimaryPdfHeader.title = (pdfOk && termsOk) ? "" : (errMsg || "Preencha os dados para gerar o PDF.");
          els.btnPrimaryPdfHeader.textContent = s.proposalMode ? "Gerar proposta agora" : "Gerar proposta em PDF";
        }
        if (els.pdfInternalFormatWrap) {
          els.pdfInternalFormatWrap.classList.toggle("hidden", !!s.proposalMode || !FEATURE_FLAGS.pdf_internal_compact_enabled);
        }
        if (FEATURE_FLAGS.ui_wizard_enabled && els.wizardBottomBar && els.wizardBottomBarValue && els.btnWizardBottomPdf) {
          const showBar = !s.proposalMode;
          els.wizardBottomBar.classList.toggle("hidden", !showBar);
          els.wizardBottomBar.setAttribute("aria-hidden", String(!showBar));
          document.body.classList.toggle("wizard-bar-visible", showBar);
          if (showBar) {
            const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
            const val = projectOk ? fmtMoney(r.projectNet, s.currency) : (r.ok && r.hourly != null ? fmtMoney(r.hourly, s.currency) : "â€”");
            safeText(els.wizardBottomBarValue, val);
            els.btnWizardBottomPdf.disabled = !pdfOk || !hasAcceptedTerms();
          }
        }
        if (FEATURE_FLAGS.ui_mobile_a11y_enabled && !FEATURE_FLAGS.ui_wizard_enabled && els.mobileA11yBar && els.mobileA11yBarValue && els.btnMobileA11yPdf) {
          const showBar = !s.proposalMode;
          els.mobileA11yBar.classList.toggle("hidden", !showBar);
          els.mobileA11yBar.setAttribute("aria-hidden", String(!showBar));
          document.body.classList.toggle("mobile-a11y-bar-visible", showBar);
          if (showBar) {
            const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
            const val = projectOk ? fmtMoney(r.projectNet, s.currency) : (r.ok && r.hourly != null ? fmtMoney(r.hourly, s.currency) : "â€”");
            safeText(els.mobileA11yBarValue, val);
            els.btnMobileA11yPdf.disabled = !pdfOk || !hasAcceptedTerms();
          }
        }
        if (els.advancedModeWrap && els.advancedModeLabel) {
          const isPremium = !!s.advancedMode;
          els.advancedModeLabel.textContent = isPremium ? "Premium" : "Essencial";
          els.advancedModeWrap.classList.toggle("border-indigo-400/30", isPremium);
          els.advancedModeWrap.classList.toggle("bg-indigo-500/15", isPremium);
          els.advancedModeWrap.classList.toggle("text-indigo-100", isPremium);
          els.advancedModeWrap.classList.toggle("border-white/10", !isPremium);
          els.advancedModeWrap.classList.toggle("bg-ink-900/70", !isPremium);
          els.advancedModeWrap.classList.toggle("text-slate-100", !isPremium);
        }
        if (els.logoStateText) els.logoStateText.textContent = logoDataUrl ? "Logo carregada" : "Adicionar logo";
        if (els.btnRemoveLogo) els.btnRemoveLogo.classList.toggle("hidden", !logoDataUrl);
        if (els.btnCopyHourly) {
          els.btnCopyHourly.disabled = !calcOk;
          els.btnCopyHourly.title = calcOk ? "" : (errMsg || "Calcule a taxa/hora primeiro.");
        }
        if (els.btnCopyProject) {
          const projectOk = calcOk && r.projectNet != null && s.projectHours > 0;
          els.btnCopyProject.disabled = !projectOk;
          els.btnCopyProject.title = projectOk ? "" : (errMsg || "Preencha horas do projeto e calcule.");
        }
        if (els.btnCopyProposal) {
          const proposalOk = calcOk && s.projectHours > 0 && r.projectNet != null;
          els.btnCopyProposal.disabled = !proposalOk;
          els.btnCopyProposal.title = proposalOk ? "" : "Preencha horas e calcule o investimento.";
        }
        if (els.btnPdf) els.btnPdf.disabled = els.btnPdf.disabled || !termsOk;
        if (els.btnPdfProposal) els.btnPdfProposal.disabled = els.btnPdfProposal.disabled || !termsOk;
        if (els.btnCopyHourly) els.btnCopyHourly.disabled = els.btnCopyHourly.disabled || !termsOk;
        if (els.btnCopyProject) els.btnCopyProject.disabled = els.btnCopyProject.disabled || !termsOk;
        if (els.btnCopyProposal) els.btnCopyProposal.disabled = els.btnCopyProposal.disabled || !termsOk;
        if (els.btnShare) {
          els.btnShare.disabled = !termsOk;
          els.btnShare.title = termsOk ? "Copiar link interno (uso interno; para cliente envie o PDF)" : "Aceite os termos no inÃ­cio da pÃ¡gina para copiar o link.";
        }
        if (els.btnExportConfig) {
          els.btnExportConfig.disabled = !termsOk;
          els.btnExportConfig.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para exportar.";
        }
        if (els.toolsExport) {
          els.toolsExport.disabled = !termsOk;
          els.toolsExport.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para exportar.";
        }
        if (els.toolsImport) {
          els.toolsImport.disabled = !termsOk;
          els.toolsImport.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para importar.";
        }
        if (els.btnCopyJustification) {
          els.btnCopyJustification.disabled = !termsOk;
          els.btnCopyJustification.title = termsOk ? "" : "Aceite os termos no inÃ­cio da pÃ¡gina para copiar.";
        }        if (els.btnInsertProposalJustification) {
          const isPinned = !!proposalJustificationPinned;
          els.btnInsertProposalJustification.disabled = !termsOk;
          els.btnInsertProposalJustification.title = termsOk
            ? (isPinned ? "Usando a versÃ£o com justificativa. Clique para voltar ao texto curto." : "Substitui o texto rÃ¡pido pela versÃ£o com justificativa tÃ©cnica.")
            : "Aceite os termos no inÃ­cio da pÃ¡gina para alternar o texto da proposta.";
          els.btnInsertProposalJustification.setAttribute(
            "aria-label",
            termsOk
              ? (isPinned ? "Usar texto curto da proposta" : "Usar texto com justificativa")
              : "Aceite os termos no inÃ­cio da pÃ¡gina para alternar o texto da proposta."
          );
        }
        syncProposalJustificationButton();
      }

      function persistState(s) {
        try {
          const sanitized = sanitizeState(defaultState(), s);
          const payload = {
            schemaVersion: STORAGE_SCHEMA_VERSION,
            data: sanitized,
            savedAt: new Date().toISOString(),
          };
          writeLocal(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // ignore
        }
      }

      function loadState() {
        try {
          const rawV2 = readLocal(STORAGE_KEY);
          if (rawV2) {
            const parsed = JSON.parse(rawV2);
            if (parsed && typeof parsed === "object" && parsed.schemaVersion === STORAGE_SCHEMA_VERSION && parsed.data) {
              return sanitizeState(defaultState(), parsed.data);
            }
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return sanitizeState(defaultState(), parsed);
            }
          }

          const rawLegacy = readLocal(LEGACY_STORAGE_KEY);
          if (!rawLegacy) return null;
          const legacyParsed = JSON.parse(rawLegacy);
          if (!legacyParsed || typeof legacyParsed !== "object" || Array.isArray(legacyParsed)) return null;
          const merged = sanitizeState(defaultState(), { ...defaultState(), ...legacyParsed });
          persistState(merged);
          return merged;
        } catch {
          return null;
        }
      }

  
    function copyToClipboard(text, okMsg) {
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(normalizeCopyToastMessage(okMsg)))
        .catch(() => showToast("NÃ£o foi possÃ­vel copiar."));
    }

    const QUERY_PARAM_KEYS = [
      "currency",
      "uiMode",
      "targetIncome",
      "monthlyCosts",
      "taxRate",
      "profitMargin",
      "buffer",
      "utilization",
      "hoursPerDay",
      "daysPerWeek",
      "vacationWeeks",
      "professionalName",
      "clientName",
      "validityDate",
      "projectHours",
      "scopeRisk",
      "discount",
      "proposalMode",
      "advancedMode",
      "enableMonteCarlo",
      "assetValue",
      "assetUsefulLifeMonths",
      "opportunityRateAnnual",
      "occupancyRate",
      "weeklyHours",
      "scopeVolatility",
      "complexidadeProjeto",
      "prazoEntrega",
      "criticidadeNegocio",
      "envolvimentoCliente",
      "impactoNoNegocio",
      "areaImpacto",
      "ocupacaoAgenda",
      "riskHistoricoAlteracoes",
      "riskComunicacaoFragmentada",
      "riskTomadorIndefinido",
      "riskEscopoIncompleto",
      "riskUrgenciaSemBriefing",
      "reservaMetaMeses",
      "reservaAtual",
      "custoPessoalMensal",
    ];

    function buildShareUrl(s, includePii, extraParams) {
      const sanitized = sanitizeState(defaultState(), s);
      const url = new URL(window.location.href);
      const params = new URLSearchParams();
      for (const k of QUERY_PARAM_KEYS) {
        if (!includePii && (k === "professionalName" || k === "clientName")) continue;
        const v = extraParams && Object.prototype.hasOwnProperty.call(extraParams, k) ? extraParams[k] : sanitized[k];
        if (v != null && v !== "") params.set(k, String(v));
      }
      if (extraParams && typeof extraParams === "object") {
        for (const [k, v] of Object.entries(extraParams)) {
          if (["projectNet", "currency", "validityDate", "projectHours"].includes(k) && v != null && v !== "") params.set(k, String(v));
        }
      }
      url.search = params.toString();
      return url.toString();
    }

    function applyQueryParams() {
      const url = new URL(window.location.href);
      const p = url.searchParams;
      const hasValidKey = QUERY_PARAM_KEYS.some((k) => p.has(k));
      if (!hasValidKey) return false;

      const baseState = { ...defaultState(), ...(loadState() || {}) };
      const s = { ...baseState };
      if (p.has("currency")) s.currency = sanitizeCurrency(p.get("currency") || "BRL");
      if (p.has("uiMode")) s.uiMode = normalizeUiMode(p.get("uiMode") || "essencial");
      if (p.has("targetIncome")) s.targetIncome = toNum(p.get("targetIncome"));
      if (p.has("monthlyCosts")) s.monthlyCosts = toNum(p.get("monthlyCosts"));
      if (p.has("taxRate")) s.taxRate = toNum(p.get("taxRate"));
      if (p.has("profitMargin")) s.profitMargin = toNum(p.get("profitMargin"));
      if (p.has("buffer")) s.buffer = toNum(p.get("buffer"));
      if (p.has("utilization")) s.utilization = toNum(p.get("utilization"));
      if (p.has("hoursPerDay")) s.hoursPerDay = toNum(p.get("hoursPerDay"));
      if (p.has("daysPerWeek")) s.daysPerWeek = toNum(p.get("daysPerWeek"));
      if (p.has("vacationWeeks")) s.vacationWeeks = toNum(p.get("vacationWeeks"));
      if (p.has("professionalName")) s.professionalName = p.get("professionalName") ?? "";
      if (p.has("clientName")) s.clientName = p.get("clientName") ?? "";
      if (p.has("validityDate")) s.validityDate = p.get("validityDate") ?? "";
      if (p.has("projectHours")) s.projectHours = toNum(p.get("projectHours"));
      if (p.has("scopeRisk")) s.scopeRisk = toNum(p.get("scopeRisk"));
      if (p.has("discount")) s.discount = toNum(p.get("discount"));
      if (p.has("proposalMode")) s.proposalMode = p.get("proposalMode") === "true";
      if (p.has("advancedMode")) s.advancedMode = p.get("advancedMode") === "true";
      if (p.has("enableMonteCarlo")) s.enableMonteCarlo = p.get("enableMonteCarlo") === "true";
      if (p.has("assetValue")) s.assetValue = toNum(p.get("assetValue"));
      if (p.has("assetUsefulLifeMonths")) s.assetUsefulLifeMonths = toNum(p.get("assetUsefulLifeMonths"));
      if (p.has("opportunityRateAnnual")) s.opportunityRateAnnual = toNum(p.get("opportunityRateAnnual"));
      if (p.has("occupancyRate")) s.occupancyRate = toNum(p.get("occupancyRate"));
      if (p.has("weeklyHours")) s.weeklyHours = toNum(p.get("weeklyHours"));
      if (p.has("scopeVolatility")) s.scopeVolatility = (p.get("scopeVolatility") || "medium").toLowerCase();
      if (p.has("complexidadeProjeto")) s.complexidadeProjeto = (p.get("complexidadeProjeto") || "media").toLowerCase();
      if (p.has("prazoEntrega")) s.prazoEntrega = (p.get("prazoEntrega") || "normal").toLowerCase();
      if (p.has("criticidadeNegocio")) s.criticidadeNegocio = (p.get("criticidadeNegocio") || "media").toLowerCase();
      if (p.has("envolvimentoCliente")) s.envolvimentoCliente = (p.get("envolvimentoCliente") || "medio").toLowerCase();
      if (p.has("impactoNoNegocio")) s.impactoNoNegocio = (p.get("impactoNoNegocio") || "medio").toLowerCase();
      if (p.has("areaImpacto")) s.areaImpacto = p.get("areaImpacto") || "";
      if (p.has("ocupacaoAgenda")) s.ocupacaoAgenda = toNum(p.get("ocupacaoAgenda"));
      if (p.has("riskHistoricoAlteracoes")) s.riskHistoricoAlteracoes = p.get("riskHistoricoAlteracoes") === "true";
      if (p.has("riskComunicacaoFragmentada")) s.riskComunicacaoFragmentada = p.get("riskComunicacaoFragmentada") === "true";
      if (p.has("riskTomadorIndefinido")) s.riskTomadorIndefinido = p.get("riskTomadorIndefinido") === "true";
      if (p.has("riskEscopoIncompleto")) s.riskEscopoIncompleto = p.get("riskEscopoIncompleto") === "true";
      if (p.has("riskUrgenciaSemBriefing")) s.riskUrgenciaSemBriefing = p.get("riskUrgenciaSemBriefing") === "true";
      if (p.has("reservaMetaMeses")) s.reservaMetaMeses = toNum(p.get("reservaMetaMeses"));
      if (p.has("reservaAtual")) s.reservaAtual = toNum(p.get("reservaAtual"));
      if (p.has("custoPessoalMensal")) s.custoPessoalMensal = toNum(p.get("custoPessoalMensal"));
      setInputsFromState(sanitizeState(defaultState(), s));
      return true;
    }

    function defaultState() {
      return {
        currency: "BRL",
        uiMode: "essencial",
        targetIncome: 9000,
        monthlyCosts: 1200,
        taxRate: 12,
        profitMargin: 15,
        buffer: 10,
        utilization: 60,
        hoursPerDay: 6,
        daysPerWeek: 5,
        vacationWeeks: 4,
        professionalName: "",
        clientName: "",
        validityDate: "",
        projectHours: 30,
        scopeRisk: 15,
        discount: 0,
        proposalMode: false,
        pdfInternalFormat: "complete",
        advancedMode: false,
        enableMonteCarlo: false,
        assetValue: 0,
        assetUsefulLifeMonths: 48,
        opportunityRateAnnual: 12,
        occupancyRate: 70,
        weeklyHours: 40,
        scopeVolatility: "medium",
        complexidadeProjeto: "media",
        prazoEntrega: "normal",
        criticidadeNegocio: "media",
        envolvimentoCliente: "medio",
        impactoNoNegocio: "medio",
        areaImpacto: "",
        ocupacaoAgenda: 70,
        riskHistoricoAlteracoes: false,
        riskComunicacaoFragmentada: false,
        riskTomadorIndefinido: false,
        riskEscopoIncompleto: false,
        riskUrgenciaSemBriefing: false,
        reservaMetaMeses: 6,
        reservaAtual: 0,
        custoPessoalMensal: 0,
        modoEstrategista: false,
        valorGanhoEstimado12m: 0,
        custoOportunidadeMensal: 0,
      };
    }

    function loadJsPdf() {
      if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf);
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "/dist/jspdf.umd.min.js";
        s.async = true;
        s.onload = function () {
          if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf);
          else reject(new Error("jsPDF nÃ£o disponÃ­vel"));
        };
        s.onerror = function () { reject(new Error("Falha ao carregar jsPDF")); };
        document.head.appendChild(s);
      });
    }

    function generatePdf() {
      const s = getStateFromInputs();
      sendCalculadoraToWebhook(s).catch((err) => console.error("Webhook calculadora â€“ erro:", err));

      if (!hasAcceptedTerms()) {
        showToast("Para gerar o PDF, aceite os termos no inÃ­cio da pÃ¡gina.");
        return;
      }
      const r = buildPricingContext(s).effective;
      const curr = s.currency;
      const proposalMode = !!s.proposalMode;
      const negotiationCtx = buildNegotiationContext(s, r);
      const justificationText = buildJustificationClipboardText(s, negotiationCtx);
      const antiDiscountPhrases = getAntiDiscountPhrases(s, negotiationCtx);

      const sPdf = {
        ...s,
        professionalName: normalizeTextForPdf(s.professionalName, PDF_FIELD_MAX.professionalName),
        clientName: normalizeTextForPdf(s.clientName, PDF_FIELD_MAX.clientName),
        validityDate: normalizeTextForPdf(s.validityDate, PDF_FIELD_MAX.validityDate),
      };
      const propostaNorm = () => normalizeTextForPdf(getProposalTextForPdf(), PDF_FIELD_MAX.proposta);
      const antiNorm = () => antiDiscountPhrases.map((p) => normalizeTextForPdf(p, PDF_FIELD_MAX.justificationPhrase));
      const justificationTextNorm = normalizeTextForPdf(justificationText, 2000);
      const roiTextNorm = negotiationCtx.roi.enabled && negotiationCtx.roi.text
        ? normalizeTextForPdf(`${negotiationCtx.roi.text} ${negotiationCtx.roi.caveat}`, PDF_FIELD_MAX.justificationPhrase)
        : "";

      if (proposalMode) {
        const hasProject = s.projectHours > 0 && r.ok && r.projectNet != null;
        if (!hasProject) {
          showToast("Preencha horas e valor do projeto antes de gerar a proposta.");
          return;
        }
      } else if (!r.ok || r.hourly == null || r.revenueTarget == null) {
        showToast(r.error ? r.error.message : "Preencha os dados principais antes de gerar o PDF.");
        return;
      }

      const useExecutiveBuilder = !!FEATURE_FLAGS.pdf_executive_proposal_enabled && proposalMode;

      loadJsPdf().then(async function (jspdfMod) {
        try {
          if (useExecutiveBuilder) {
            const execFormat = (!!FEATURE_FLAGS.pdf_internal_compact_enabled && s.pdfInternalFormat === "compact") ? "compact" : "complete";
            const mod = await import("./pdf-executive-entry.js");
            const fontResult = await mod.generatePdfExecutive({
              state: sPdf,
              jsPdf: jspdfMod,
              logoDataUrl,
              format: execFormat,
              flags: FEATURE_FLAGS,
              deps: {
                buildPricingContext,
                buildNegotiationContext,
                getProposalTextForPdf: propostaNorm,
                getAntiDiscountPhrases: antiNorm,
                buildJustificationClipboardText: (st, ctx) => normalizeTextForPdf(buildJustificationClipboardText(st, ctx), 2000),
                buildJustificationClipboardText,
                computeStrategistMetrics,
                ensurePdfYSpace: ensurePdfYSpaceModel,
                fmtMoney,
                fmtNumber,
                formatStrategistValue,
                STRATEGIST_CAVEAT,
                LEGAL_DISCLAIMER,
                BRAND_NAME,
                trackEvent,
                playfairFontUrl: FEATURE_FLAGS.pdf_playfair_font_url || null,
                playfairFontBase64: FEATURE_FLAGS.pdf_playfair_font_base64 || null,
              },
            });
            const modeCtx = buildPricingContext(s);
            trackEvent("pdf_generated", { mode: modeCtx.mode || "essential", proposalMode: true, pdfV2: !!FEATURE_FLAGS.pdf_v2_enabled, internalFormat: execFormat, executiveBuilder: true, fontMode: fontResult?.fontMode ?? "fallback", format: execFormat });
            showToast("PDF gerado.");
            return;
          }
        } catch (execErr) {
          if (useExecutiveBuilder) {
            showToast("Erro ao gerar PDF executivo. Usando versÃ£o anterior.");
          }
          if (execErr && !useExecutiveBuilder) throw execErr;
        }

        try {
          const { jsPDF } = jspdfMod;
          const doc = new jsPDF({ unit: "pt", format: "a4" });
          const margin = 56;
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          let y = margin;
          const pdfV2 = !!FEATURE_FLAGS.pdf_v2_enabled;
          const ensureSpace = (needed = 84) => {
            const guard = ensurePdfYSpaceModel
              ? ensurePdfYSpaceModel(y, needed, pageHeight, margin, 72)
              : { y, addPage: false };
            if (guard.addPage) {
              doc.addPage();
              y = guard.y;
            }
          };
          const advanceY = (step = 0) => {
            y = advancePdfYModel ? advancePdfYModel(y, step) : (y + step);
          };
          const advanceYByLines = (lineCount, lineHeight = 12, spacingAfter = 0) => {
            y = advancePdfYByLinesModel ? advancePdfYByLinesModel(y, lineCount, lineHeight, spacingAfter) : (y + (lineCount * lineHeight) + spacingAfter);
          };
          const writeWrappedSummary = (text, opts = {}) => {
            const maxWidth = opts.maxWidth || (pageWidth - 2 * margin);
            const lineHeight = opts.lineHeight || 12;
            const spacingAfter = opts.spacingAfter || 0;
            const minRoom = opts.minRoom || 56;
            const lines = doc.splitTextToSize(String(text || ""), maxWidth);
            const needed = Math.max(minRoom, (lines.length * lineHeight) + spacingAfter + 8);
            ensureSpace(needed);
            doc.text(lines, margin, y);
            advanceYByLines(lines.length, lineHeight, spacingAfter);
          };

          if (proposalMode) {
            if (logoDataUrl) {
              const format = logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
              const logoWidth = 180;
              const logoHeight = 60;
              const logoX = (pageWidth - logoWidth) / 2;
              doc.addImage(logoDataUrl, format, logoX, y, logoWidth, logoHeight);
              y += logoHeight + 24;
            }
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(BRAND_NAME, margin, y);
            advanceY(16);
            const profLabel = sPdf.professionalName || "Profissional ResponsÃ¡vel";
            doc.text(`ResponsÃ¡vel: ${profLabel}`, margin, y);
            y += 18;
            if (sPdf.clientName) {
              doc.text(`Cliente / Projeto: ${sPdf.clientName}`, margin, y);
              y += 18;
            }
            if (sPdf.validityDate) {
              doc.text(`Data: ${sPdf.validityDate}`, margin, y);
              y += 24;
            }
            if (pdfV2) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(16);
              doc.text("Resumo Executivo", margin, y);
              y += 22;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(11);
              doc.text("Este documento apresenta estimativas robustas para apoiar decisÃ£o comercial.", margin, y);
              advanceY(20);
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(pdfV2 ? "LÃ³gica de PrecificaÃ§Ã£o" : "Escopo da SoluÃ§Ã£o", margin, y);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            advanceY(18);
            doc.text("Escopo definido conforme objetivos e entregÃ¡veis acordados.", margin, y);
            advanceY(16);
            const prazoDias = Math.ceil((s.projectHours / Math.max(1, s.hoursPerDay)) * (100 / Math.max(1, s.utilization)));
            doc.text(`Prazo estimado: ${fmtNumber(prazoDias, 0)} dias Ãºteis`, margin, y);
            advanceY(12);
            const stratPdf = !!FEATURE_FLAGS.strategist_mode_enabled && !!s.modoEstrategista && computeStrategistMetrics ? computeStrategistMetrics({
              precoBase: s.projectHours > 0 && r.ok && r.projectNet != null ? r.projectNet : null,
              valorGanhoEstimado12m: s.valorGanhoEstimado12m,
              custoOportunidadeMensal: s.custoOportunidadeMensal,
            }) : null;
            const showImpactCliente = !!FEATURE_FLAGS.pdf_impact_block_enabled && stratPdf && stratPdf.ok;
            if (showImpactCliente) {
              const cdoVal = stratPdf.cdo != null ? fmtMoneyPdf(stratPdf.cdo, curr) : "â€”";
              writeWrappedSummary(`Cronograma: estimativa consultiva; nÃ£o constitui promessa de prazo. CDO (custo diÃ¡rio de oportunidade): ${cdoVal}.`, { lineHeight: 11, spacingAfter: 8, minRoom: 44 });
            }
            advanceY(16);
            const proposta = propostaNorm();
            if (proposta) {
              ensureSpace(140);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(12);
              doc.text(pdfV2 ? "RecomendaÃ§Ã£o Final" : "Proposta", margin, y);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(11);
              advanceY(18);
              const maxWidth = pageWidth - 2 * margin;
              const lines = doc.splitTextToSize(proposta, maxWidth);
              doc.text(lines, margin, y);
              advanceY(lines.length * 14 + 24);
            }
            if (showImpactCliente) {
              ensureSpace(80);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(11);
              doc.text("Impacto EconÃ´mico Estimado", margin, y);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              advanceY(14);
              const vceStr = stratPdf.vce != null ? formatStrategistValue(stratPdf.vce, "percent") : "â€”";
              const roixStr = stratPdf.roix != null ? `${fmtNumber(stratPdf.roix, 1)}x` : "â€”";
              const cdoStr = stratPdf.cdo != null ? fmtMoneyPdf(stratPdf.cdo, curr) : "â€”";
              doc.text(`VCE: ${vceStr} | ROIx: ${roixStr} | CDO: ${cdoStr}`, margin, y);
              advanceY(12);
              if (STRATEGIST_CAVEAT) {
                const caveatLines = doc.splitTextToSize(STRATEGIST_CAVEAT, pageWidth - 2 * margin);
                doc.text(caveatLines, margin, y);
                advanceY(caveatLines.length * 10 + 12);
              }
            }
            const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
            const validadeTexto = sPdf.validityDate
              ? `Proposta v\u00E1lida at\u00E9 ${sPdf.validityDate}.`
              : "Proposta v\u00E1lida por 7 dias.";
            const approvalLine = `${validadeTexto} Para aprovar, responda esta proposta com 'APROVADO'.`;
            const investmentBlockHeight = projectOk ? 58 : 46;
            ensureSpace(investmentBlockHeight + 40);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("Investimento Total", margin, y);
            doc.setFont("helvetica", "normal");
            advanceY(20);
            if (projectOk) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(18);
              doc.text(fmtMoneyPdf(r.projectNet, curr), margin, y);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(11);
            } else {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(11);
              doc.text("Preencha as horas estimadas para calcular o investimento.", margin, y);
            }

            advanceY(projectOk ? 26 : 18);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            writeWrappedSummary(LEGAL_DISCLAIMER, { lineHeight: 10, spacingAfter: 6, minRoom: 28 });
            doc.setFontSize(9);
            writeWrappedSummary(approvalLine, { lineHeight: 10, spacingAfter: 0, minRoom: 24 });
          } else {
            const useCompact = !!FEATURE_FLAGS.pdf_internal_compact_enabled && s.pdfInternalFormat === "compact";
            if (useCompact) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(14);
              doc.text(`${BRAND_NAME} - Resumo Compacto`, margin, y);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              y += 20;
              if (sPdf.professionalName) { doc.text(`Profissional: ${sPdf.professionalName}`, margin, y); y += 12; }
              if (sPdf.clientName) { doc.text(`Cliente: ${sPdf.clientName}`, margin, y); y += 12; }
              doc.text(`Moeda: ${curr}`, margin, y);
              y += 18;
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.text("Resumo financeiro", margin, y);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              y += 14;
              doc.text(`Faturamento alvo/mÃªs: ${fmtMoneyPdf(r.revenueTarget, curr)}`, margin, y);
              y += 11;
              doc.text(`Taxa/hora: ${fmtMoneyPdf(r.hourly, curr)} | Taxa/dia: ${fmtMoneyPdf(r.daily, curr)}`, margin, y);
              y += 11;
              const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
              if (projectOk) {
                doc.text(`PreÃ§o projeto (${fmtNumber(s.projectHours, 0)}h): ${fmtMoneyPdf(r.projectNet, curr)}`, margin, y);
                y += 14;
                const prazoDias = Math.ceil((s.projectHours / Math.max(1, s.hoursPerDay)) * (100 / Math.max(1, s.utilization)));
                doc.text(`Prazo estimado: ~${fmtNumber(prazoDias, 0)} dias Ãºteis`, margin, y);
                y += 18;
              } else {
                y += 8;
              }
              const propostaCompact = propostaNorm();
              if (propostaCompact) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text("RecomendaÃ§Ã£o", margin, y);
                doc.setFont("helvetica", "normal");
                y += 12;
                const maxWidth = pageWidth - 2 * margin;
                const lines = doc.splitTextToSize(propostaCompact, maxWidth);
                const maxLines = 4;
                const showLines = lines.slice(0, maxLines);
                const truncated = lines.length > maxLines;
                doc.text(showLines, margin, y);
                y += showLines.length * 10;
                if (truncated) {
                  doc.setFontSize(8);
                  doc.text("â€¦", margin, y);
                  y += 10;
                }
                y += 12;
              }
              const footerY = pageHeight - margin - 50;
              doc.setFontSize(7);
              const disclaimerLines = doc.splitTextToSize(LEGAL_DISCLAIMER, pageWidth - 2 * margin);
              doc.text(disclaimerLines, margin, footerY);
              doc.setFontSize(8);
              const validadeTexto = sPdf.validityDate
                ? `Proposta vÃ¡lida atÃ© ${sPdf.validityDate}.`
                : "Proposta vÃ¡lida por 7 dias.";
              doc.text(validadeTexto, margin, footerY + disclaimerLines.length * 7 + 4);
            } else {
              if (logoDataUrl) {
                const format = logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
                const logoWidth = 120;
                const logoHeight = 40;
                doc.addImage(logoDataUrl, format, pageWidth - margin - logoWidth, margin - 10, logoWidth, logoHeight);
              }
              doc.setFont("helvetica", "bold");
              doc.setFontSize(18);
              const reportTitle = pdfV2
                ? `${BRAND_NAME} - RelatÃ³rio Consultivo de PrecificaÃ§Ã£o`
                : `${BRAND_NAME} - Proposta de PrestaÃ§Ã£o de ServiÃ§os`;
              const titleMaxWidth = pageWidth - (2 * margin) - (logoDataUrl ? 136 : 0);
              const titleLines = doc.splitTextToSize(reportTitle, Math.max(240, titleMaxWidth));
              doc.text(titleLines, margin, y);
              y += titleLines.length * 22;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(11);
              if (sPdf.professionalName) {
                doc.text(`Profissional: ${sPdf.professionalName}`, margin, y);
                y += 16;
              }
              if (sPdf.clientName) {
                doc.text(`Cliente: ${sPdf.clientName}`, margin, y);
                y += 16;
              }
              doc.text(`Moeda: ${curr}`, margin, y);
              y += 24;
              doc.setFont("helvetica", "bold");
              doc.text(pdfV2 ? "Resumo Executivo" : "Resumo de custos e metas", margin, y);
              doc.setFont("helvetica", "normal");
              y += 18;
              doc.text(`Renda lÃ­quida desejada/mÃªs: ${fmtMoneyPdf(s.targetIncome, curr)}`, margin, y);
              y += 16;
              doc.text(`Custos fixos do negÃ³cio/mÃªs: ${fmtMoneyPdf(s.monthlyCosts, curr)}`, margin, y);
              y += 16;
              doc.text(`Impostos sobre faturamento: ${fmtNumber(s.taxRate, 1)}%`, margin, y);
              y += 16;
              doc.text(`Margem de lucro: ${fmtNumber(s.profitMargin, 1)}%`, margin, y);
              y += 16;
              doc.text(`Buffer (atrasos/imprevistos): ${fmtNumber(s.buffer, 1)}%`, margin, y);
              y += 24;
              doc.setFont("helvetica", "bold");
              doc.text(pdfV2 ? "LÃ³gica de PrecificaÃ§Ã£o" : "Capacidade de trabalho", margin, y);
              doc.setFont("helvetica", "normal");
              y += 18;
              doc.text(`Taxa de horas faturÃ¡veis: ${fmtNumber(s.utilization, 1)}%`, margin, y);
              y += 16;
              doc.text(`Horas/dia: ${fmtNumber(s.hoursPerDay, 1)}h`, margin, y);
              y += 16;
              doc.text(`Dias/semana: ${fmtNumber(s.daysPerWeek, 0)}`, margin, y);
              y += 16;
              doc.text(`Semanas de folga/ano: ${fmtNumber(s.vacationWeeks, 1)}`, margin, y);
              y += 16;
              doc.text(`Horas faturÃ¡veis estimadas/mÃªs: ${fmtNumber(r.billableHours, 1)}h`, margin, y);
              y += 24;
              doc.setFont("helvetica", "bold");
              doc.text("Resumo financeiro", margin, y);
              doc.setFont("helvetica", "normal");
              y += 18;
              doc.text(`Faturamento alvo/mÃªs: ${fmtMoneyPdf(r.revenueTarget, curr)}`, margin, y);
              y += 16;
              doc.text(`Taxa/hora sugerida: ${fmtMoneyPdf(r.hourly, curr)}`, margin, y);
              y += 16;
              doc.text(`Taxa/dia (${fmtNumber(s.hoursPerDay, 1)}h): ${fmtMoneyPdf(r.daily, curr)}`, margin, y);
              const projectOk = r.ok && r.projectNet != null && s.projectHours > 0;
              if (projectOk) {
                y += 24;
                doc.setFont("helvetica", "bold");
                doc.text("Projeto estimado", margin, y);
                doc.setFont("helvetica", "normal");
                y += 18;
                doc.text(`Horas estimadas: ${fmtNumber(s.projectHours, 0)}h`, margin, y);
                y += 16;
                doc.text(`Margem de escopo: ${fmtNumber(s.scopeRisk, 1)}%`, margin, y);
                y += 16;
                doc.text(`Desconto aplicado: ${fmtNumber(s.discount, 1)}%`, margin, y);
                y += 16;
                doc.text(`PreÃ§o sugerido do projeto: ${fmtMoneyPdf(r.projectNet, curr)}`, margin, y);
              }
              const stratInterno = !!FEATURE_FLAGS.strategist_mode_enabled && !!s.modoEstrategista && computeStrategistMetrics ? computeStrategistMetrics({
                precoBase: s.projectHours > 0 && r.ok && r.projectNet != null ? r.projectNet : null,
                valorGanhoEstimado12m: s.valorGanhoEstimado12m,
                custoOportunidadeMensal: s.custoOportunidadeMensal,
              }) : null;
              if (stratInterno && stratInterno.ok) {
                y += 24;
                ensureSpace(100);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.text("Impacto EconÃ´mico Estimado", margin, y);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                advanceY(16);
                const premLines = doc.splitTextToSize("Premissas: preÃ§o base = valor do projeto; VCE = (preÃ§o Ã· ganho 12m) Ã— 100; ROIx = ganho Ã· preÃ§o; CDO = custo oportunidade mensal Ã· 30.", pageWidth - 2 * margin);
                doc.text(premLines, margin, y);
                advanceY(premLines.length * 10 + 8);
                const vceStr = stratInterno.vce != null ? formatStrategistValue(stratInterno.vce, "percent") : "â€”";
                const roixStr = stratInterno.roix != null ? `${fmtNumber(stratInterno.roix, 1)}x` : "â€”";
                const cdoStr = stratInterno.cdo != null ? fmtMoneyPdf(stratInterno.cdo, curr) : "â€”";
                doc.text(`VCE: ${vceStr} | ROIx: ${roixStr} | CDO: ${cdoStr}`, margin, y);
                advanceY(12);
                if (stratInterno.vceLabel) doc.text(`InterpretaÃ§Ã£o VCE: ${stratInterno.vceLabel}`, margin, y);
                advanceY(stratInterno.vceLabel ? 12 : 0);
                if (stratInterno.viabilidadeAlerta) {
                  advanceY(4);
                  doc.text("Alerta: viabilidade questionÃ¡vel (ganho estimado menor que o preÃ§o).", margin, y);
                  advanceY(12);
                }
                if (STRATEGIST_CAVEAT) {
                  advanceY(4);
                  const caveatLines = doc.splitTextToSize(STRATEGIST_CAVEAT, pageWidth - 2 * margin);
                  doc.text(caveatLines, margin, y);
                  advanceY(caveatLines.length * 10 + 8);
                }
                const cdoVal = stratInterno.cdo != null ? fmtMoneyPdf(stratInterno.cdo, curr) : "â€”";
                advanceY(4);
                doc.text(`Cronograma: estimativa consultiva; nÃ£o constitui promessa de prazo. CDO: ${cdoVal}.`, margin, y);
                advanceY(16);
              }
              y += 36;
              const propostaRel = propostaNorm();
              if (propostaRel) {
                ensureSpace(140);
                doc.setFont("helvetica", "bold");
                doc.text(pdfV2 ? "RecomendaÃ§Ã£o Final" : "Texto de proposta sugerido", margin, y);
                doc.setFont("helvetica", "normal");
                y += 18;
                const maxWidth = 500;
                const lines = doc.splitTextToSize(propostaRel, maxWidth);
                doc.text(lines, margin, y);
                y += lines.length * 12 + 16;
              }
              ensureSpace(140);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(12);
              doc.text("Justificativas de negociaÃ§Ã£o", margin, y);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              y += 16;
              const jLinesRel = doc.splitTextToSize(justificationTextNorm, pageWidth - 2 * margin);
              doc.text(jLinesRel, margin, y);
              y += jLinesRel.length * 12 + 12;
              if (roiTextNorm) {
                ensureSpace(60);
                const roiLinesRel = doc.splitTextToSize(roiTextNorm, pageWidth - 2 * margin);
                doc.text(roiLinesRel, margin, y);
                y += roiLinesRel.length * 12 + 12;
              }
              ensureSpace(72);
              doc.setFontSize(10);
              doc.text(
                `ProteÃ§Ã£o de Escopo: ${fmtNumber(negotiationCtx.scopeShield.markupPct, 1)}% (${formatScopeLevel(negotiationCtx.scopeShield.level)}). ` +
                `PrÃªmio de conveniÃªncia: ${fmtNumber(negotiationCtx.scarcity.markupPct, 1)}%.`,
                margin,
                y
              );
              y += 14;
              doc.text(
                `FÃ´lego financeiro atual: ${fmtNumber(negotiationCtx.runway.runwayMesesAtual, 1)} meses | pÃ³s-projeto: ${fmtNumber(negotiationCtx.runway.runwayMesesPosProjeto, 1)} meses.`,
                margin,
                y
              );
              y += 18;
              ensureSpace(140);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(11);
              doc.text("Frases de negociaÃ§Ã£o sugeridas", margin, y);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              y += 14;
              antiNorm().forEach((phrase) => {
                const lineItems = doc.splitTextToSize(`- ${phrase}`, pageWidth - 2 * margin);
                ensureSpace(Math.max(48, lineItems.length * 12 + 8));
                doc.text(lineItems, margin, y);
                y += lineItems.length * 12 + 2;
              });
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              const disclaimerLinesRel = doc.splitTextToSize(LEGAL_DISCLAIMER, pageWidth - 2 * margin);
              let footerYRel = pageHeight - margin - disclaimerLinesRel.length * 10 - 14;
              doc.text(disclaimerLinesRel, margin, footerYRel);
              footerYRel += disclaimerLinesRel.length * 10 + 4;
              doc.setFontSize(9);
              const validadeTextoRelatorio = sPdf.validityDate
                ? `Proposta vÃ¡lida atÃ© ${sPdf.validityDate}.`
                : "Proposta vÃ¡lida por 7 dias.";
              doc.text(`${validadeTextoRelatorio} Para aprovar, responda esta proposta com 'APROVADO'.`, margin, footerYRel);
            }
          }

          doc.save("proposta-freelancer.pdf");
          const modeCtx = buildPricingContext(s);
          const internalFormat = !proposalMode ? (s.pdfInternalFormat === "compact" ? "compact" : "complete") : null;
          trackEvent("pdf_generated", { mode: modeCtx.mode || "essential", proposalMode, pdfV2, internalFormat, executiveBuilder: useExecutiveBuilder });
          showToast("PDF gerado.");
        } catch {
          showToast("NÃ£o foi possÃ­vel gerar o PDF.");
        }
      }).catch(function (err) {
        showToast(err && err.message ? err.message : "Biblioteca jsPDF nÃ£o foi carregada. Verifique sua conexÃ£o.");
      });
    }

    function resetAll() {
      try {
        removeLocal(STORAGE_KEY);
        removeLocal(LEGACY_STORAGE_KEY);
      } catch {
        // ignore
      }
      setInputsFromState(defaultState());
      updateUI();
      showToast("Resetado.");
    }

    function wireEvents() {
      const inputs = [
        els.currency,
        els.targetIncome,
        els.monthlyCosts,
        els.taxRate,
        els.profitMargin,
        els.buffer,
        els.utilization,
        els.hoursPerDay,
        els.daysPerWeek,
        els.vacationWeeks,
        els.professionalName,
        els.clientName,
        els.validityDate,
        els.projectHours,
        els.scopeRisk,
        els.discount,
        els.scopeClarity,
        els.urgentDeadline,
        els.revisionLoad,
        els.engagementModel,
        els.monthlyVolumeHours,
        els.assetValue,
        els.assetUsefulLifeMonths,
        els.opportunityRateAnnual,
        els.occupancyRate,
        els.weeklyHours,
        els.scopeVolatility,
        els.complexidadeProjeto,
        els.prazoEntrega,
        els.criticidadeNegocio,
        els.envolvimentoCliente,
        els.impactoNoNegocio,
        els.areaImpacto,
        els.ocupacaoAgenda,
        els.reservaMetaMeses,
        els.reservaAtual,
        els.custoPessoalMensal,
        els.valorGanhoEstimado12m,
        els.custoOportunidadeMensal,
      ];
      for (const el of inputs) {
        if (el) {
          el.addEventListener("input", updateUI);
          el.addEventListener("change", updateUI);
        }
      }
      if (els.modoEstrategista) {
        els.modoEstrategista.addEventListener("change", updateUI);
      }
      const scopeRiskChecks = [
        els.riskHistoricoAlteracoes,
        els.riskComunicacaoFragmentada,
        els.riskTomadorIndefinido,
        els.riskEscopoIncompleto,
        els.riskUrgenciaSemBriefing,
      ];
      for (const el of scopeRiskChecks) {
        if (el) el.addEventListener("change", updateUI);
      }

      bindTraceabilityModeEvents();

      if (els.btnCopyHourly) els.btnCopyHourly.addEventListener("click", () => {
        if (!hasAcceptedTerms()) {
          showToast("Para usar esta funÃ§Ã£o, aceite os termos no inÃ­cio da pÃ¡gina.");
          return;
        }
        const s = getStateFromInputs();
        const r = buildPricingContext(s).effective;
        if (!r.ok || r.hourly == null) return showToast("Nada para copiar.");
        copyToClipboard(fmtMoney(r.hourly, s.currency), "Taxa/hora copiada.");
      });
      if (els.btnCopyProject) els.btnCopyProject.addEventListener("click", () => {
        if (!hasAcceptedTerms()) {
          showToast("Para usar esta funÃ§Ã£o, aceite os termos no inÃ­cio da pÃ¡gina.");
          return;
        }
        const s = getStateFromInputs();
        const r = buildPricingContext(s).effective;
        if (!r.ok || r.projectNet == null || s.projectHours <= 0) return showToast("Nada para copiar.");
        copyToClipboard(fmtMoney(r.projectNet, s.currency), "Valor do projeto copiado.");
      });
      if (els.btnCopyProposal) els.btnCopyProposal.addEventListener("click", () => {
        if (!hasAcceptedTerms()) {
          showToast("Para usar esta funÃ§Ã£o, aceite os termos no inÃ­cio da pÃ¡gina.");
          return;
        }
        const text = els.proposalText ? els.proposalText.textContent : "";
        if (!text || text === "â€”") return showToast("Nada para copiar.");
        copyToClipboard(text, "Texto copiado.");
      });
      if (els.btnCopyJustification) els.btnCopyJustification.addEventListener("click", () => {
        if (!hasAcceptedTerms()) {
          showToast("Para usar esta funÃ§Ã£o, aceite os termos no inÃ­cio da pÃ¡gina.");
          return;
        }
        const s = getStateFromInputs();
        const r = buildPricingContext(s).effective;
        const n = buildNegotiationContext(s, r);
        const text = buildJustificationClipboardText(s, n);
        if (!text) return showToast("Nada para copiar.");
        copyToClipboard(text, "Justificativa copiada.");
      });
      if (els.btnInsertProposalJustification) els.btnInsertProposalJustification.addEventListener("click", () => {
        if (!hasAcceptedTerms()) {
          showToast("Para usar esta funÃ§Ã£o, aceite os termos no inÃ­cio da pÃ¡gina.");
          return;
        }
        const s = getStateFromInputs();
        const r = buildPricingContext(s).effective;
        const canComposeProposal = !!(r.ok && s.projectHours > 0 && r.projectNet != null);
        if (!canComposeProposal) {
          showToast("Preencha as horas do projeto para montar a proposta.");
          return;
        }
        const prevY = window.scrollY;
        proposalJustificationPinned = !proposalJustificationPinned;
        updateUI();
        requestAnimationFrame(() => window.scrollTo(0, prevY));
        showToast(
          proposalJustificationPinned
            ? "Texto da proposta alterado para a versÃ£o com justificativa."
            : "Texto da proposta voltou para a versÃ£o curta."
        );
      });
      if (els.btnShare) els.btnShare.addEventListener("click", () => {
        if (!hasAcceptedTerms()) {
          showToast("Para usar esta funÃ§Ã£o, aceite os termos no inÃ­cio da pÃ¡gina.");
          return;
        }
        const s = getStateFromInputs();
        const includePii = !!(els.shareIncludeNames && els.shareIncludeNames.checked);
        const r = buildPricingContext(s).effective;
        const projectNet = r.ok && r.projectNet != null ? r.projectNet : null;
        const url = buildShareUrl(s, includePii, projectNet != null ? { projectNet } : undefined);
        copyToClipboard(url, "Link copiado.");
      });
      if (els.btnExportConfig) els.btnExportConfig.addEventListener("click", exportConfig);
      if (els.btnImportConfig) els.btnImportConfig.addEventListener("click", importConfig);
      if (els.btnReset) els.btnReset.addEventListener("click", resetAll);
      function isToolsMobileViewport() {
        return window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
      }

      function getToolsMenuItems() {
        if (!els.toolsDropdown) return [];
        return Array.from(els.toolsDropdown.querySelectorAll('[role="menuitem"]')).filter((el) => !el.classList.contains("hidden") && !el.disabled);
      }

      function positionToolsDropdown() {
        if (!els.btnToolsToggle || !els.toolsDropdown) return;
        const menu = els.toolsDropdown;

        if (isToolsMobileViewport()) {
          menu.style.left = "12px";
          menu.style.right = "12px";
          menu.style.top = "auto";
          menu.style.bottom = "12px";
          menu.style.width = "auto";
          menu.style.maxHeight = "70vh";
          menu.style.overflow = "auto";
          return;
        }

        menu.style.width = "340px";
        menu.style.maxHeight = "min(70vh, 520px)";
        menu.style.overflow = "auto";
        menu.style.bottom = "auto";

        const anchorRect = els.btnToolsToggle.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();

        let left = anchorRect.right - menuRect.width;
        left = Math.max(12, Math.min(left, window.innerWidth - menuRect.width - 12));

        let top = anchorRect.bottom + 8;
        const overBottom = top + menuRect.height > window.innerHeight - 12;
        if (overBottom) {
          top = anchorRect.top - menuRect.height - 8;
        }
        top = Math.max(12, Math.min(top, window.innerHeight - menuRect.height - 12));

        menu.style.left = left + "px";
        menu.style.top = top + "px";
        menu.style.right = "auto";
      }

      function openToolsDropdown() {
        if (!els.toolsDropdown) return;
        if (els.toolsBackdrop) els.toolsBackdrop.classList.remove("hidden");
        els.toolsDropdown.classList.remove("hidden");
        if (els.btnToolsToggle) els.btnToolsToggle.setAttribute("aria-expanded", "true");
        positionToolsDropdown();
        requestAnimationFrame(positionToolsDropdown);
        const items = getToolsMenuItems();
        if (items[0]) requestAnimationFrame(() => items[0].focus());
      }

      function closeToolsDropdown(options) {
        const keepFocus = !!(options && options.keepFocus);
        if (els.toolsBackdrop) els.toolsBackdrop.classList.add("hidden");
        if (els.toolsDropdown) els.toolsDropdown.classList.add("hidden");
        if (els.btnToolsToggle) els.btnToolsToggle.setAttribute("aria-expanded", "false");
        if (!keepFocus && els.btnToolsToggle) els.btnToolsToggle.focus();
      }

      if (els.toolsExport) els.toolsExport.addEventListener("click", () => { closeToolsDropdown({ keepFocus: true }); exportConfig(); });
      if (els.toolsImport) els.toolsImport.addEventListener("click", () => { closeToolsDropdown({ keepFocus: true }); importConfig(); });
      if (els.toolsReset) els.toolsReset.addEventListener("click", () => { closeToolsDropdown({ keepFocus: true }); resetAll(); });
      if (els.toolsInstall) els.toolsInstall.addEventListener("click", () => { closeToolsDropdown({ keepFocus: true }); triggerAppInstall(); });
      // Event delegation: garante que sendCalculadoraToWebhook seja chamado ao clicar em qualquer botÃ£o "Gerar proposta"
      const pdfButtonIds = ["btnPrimaryPdfHeader", "btnPrimaryPdfHeaderWrap", "btnPdf", "btnPdfProposal", "btnPdfFromPreview", "btnWizardBottomPdf", "btnMobileA11yPdf"];
      document.addEventListener("click", (e) => {
        const clicked = e.target.closest(pdfButtonIds.map((id) => "#" + id).join(", "));
        if (clicked) {
          const s = getStateFromInputs();
          sendCalculadoraToWebhook(s).catch((err) => console.error("Webhook calculadora â€“ erro:", err));
          console.log("Webhook calculadora â€“ dados enviados (pergunta):", s);
        }
      }, true);

      if (els.btnPrimaryPdfHeader) els.btnPrimaryPdfHeader.addEventListener("click", generatePdf);
      // LigaÃ§Ã£o explÃ­cita do clique para envio ao n8n (garante disparo do webhook)
      const btnGerarProposta = document.getElementById("btnPrimaryPdfHeader");
      if (btnGerarProposta) {
        btnGerarProposta.addEventListener("click", function () {
          const dados = getStateFromInputs();
          sendCalculadoraToWebhook(dados).catch((err) => console.error("Webhook calculadora â€“ erro:", err));
        });
      }
      if (els.btnPrimaryPdfHeaderWrap) {
        els.btnPrimaryPdfHeaderWrap.addEventListener("click", (e) => {
          if (e.target === els.btnPrimaryPdfHeader && !els.btnPrimaryPdfHeader.disabled) return;
          if (!els.btnPrimaryPdfHeader.disabled) generatePdf();
        });
        els.btnPrimaryPdfHeaderWrap.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            els.btnPrimaryPdfHeaderWrap.click();
          }
        });
      }
      if (els.btnRemoveLogo) els.btnRemoveLogo.addEventListener("click", () => {
        logoDataUrl = null;
        updateUI();
        showToast("Logo removida.");
      });
      if (els.btnToolsToggle && els.toolsDropdown) {
        els.btnToolsToggle.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = !els.toolsDropdown.classList.contains("hidden");
          if (isOpen) {
            closeToolsDropdown({ keepFocus: true });
          } else {
            openToolsDropdown();
          }
        });

        if (els.toolsBackdrop) {
          els.toolsBackdrop.addEventListener("click", () => closeToolsDropdown({ keepFocus: true }));
        }
        if (els.toolsClose) {
          els.toolsClose.addEventListener("click", () => closeToolsDropdown());
        }

        document.addEventListener("click", (e) => {
          if (els.toolsDropdown.classList.contains("hidden")) return;
          if (els.toolsDropdown.contains(e.target) || els.btnToolsToggle.contains(e.target)) return;
          closeToolsDropdown({ keepFocus: true });
        });

        window.addEventListener("resize", () => {
          if (!els.toolsDropdown.classList.contains("hidden")) positionToolsDropdown();
        });
        window.addEventListener("scroll", () => {
          if (!els.toolsDropdown.classList.contains("hidden")) positionToolsDropdown();
        }, true);

        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && !els.toolsDropdown.classList.contains("hidden")) {
            e.preventDefault();
            closeToolsDropdown();
          }
        });

        els.toolsDropdown.addEventListener("keydown", (e) => {
          const items = getToolsMenuItems();
          if (items.length === 0) return;
          const idx = items.indexOf(e.target);
          if (e.key === "Escape") {
            e.preventDefault();
            closeToolsDropdown();
            return;
          }
          if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            e.preventDefault();
            const next = idx < 0 ? 0 : Math.min(idx + 1, items.length - 1);
            items[next].focus();
          } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            e.preventDefault();
            const prev = idx <= 0 ? items.length - 1 : idx - 1;
            items[prev].focus();
          } else if (e.key === "Home") {
            e.preventDefault();
            items[0].focus();
          } else if (e.key === "End") {
            e.preventDefault();
            items[items.length - 1].focus();
          }
        });
      }

      if (els.btnPdf) {
        els.btnPdf.addEventListener("click", generatePdf);
      }
      if (els.btnPdfProposal) {
        els.btnPdfProposal.addEventListener("click", generatePdf);
      }
      if (els.btnPdfFromPreview) {
        els.btnPdfFromPreview.addEventListener("click", generatePdf);
      }
      if (els.btnMobileA11yPdf) {
        els.btnMobileA11yPdf.addEventListener("click", generatePdf);
      }

      if (els.logoInput) {
        els.logoInput.addEventListener("change", async (event) => {
          const file = event.target.files && event.target.files[0];
          if (!file) return;
          try {
            const result = await prepareLogoDataUrl(file);
            if (result && result.dataUrl) {
              const normalized = await normalizeLogoDataUrl(result.dataUrl);
              if (normalized) {
                logoDataUrl = normalized;
                showToast(result.resized ? "Logo carregada (redimensionada)." : "Logo carregada.");
              } else {
                showToast("Falha ao carregar a logo.");
              }
            } else {
              showToast("Falha ao carregar a logo.");
            }
          } catch (_) {
            showToast("Falha ao carregar a logo.");
          }
          updateUI();
        });
      }

      if (els.btnSaveScenarioA) els.btnSaveScenarioA.addEventListener("click", () => saveScenario("A"));
      if (els.btnSaveScenarioB) els.btnSaveScenarioB.addEventListener("click", () => saveScenario("B"));
      if (els.btnClearScenarios) els.btnClearScenarios.addEventListener("click", clearScenarios);
      if (els.btnLoadScenarioA) els.btnLoadScenarioA.addEventListener("click", () => loadScenario("A"));
      if (els.btnLoadScenarioB) els.btnLoadScenarioB.addEventListener("click", () => loadScenario("B"));

      if (els.btnExportCsv) els.btnExportCsv.addEventListener("click", exportCsv);
      if (els.btnCopyTsv) els.btnCopyTsv.addEventListener("click", copyTsvRow);
      if (els.btnSendSheets) els.btnSendSheets.addEventListener("click", () => sendToEndpoint("sheets"));
      if (els.btnSendNotion) els.btnSendNotion.addEventListener("click", () => sendToEndpoint("notion"));
      if (els.btnOpenIntegrationSettings) els.btnOpenIntegrationSettings.addEventListener("click", openIntegrationSettingsModal);
      if (els.btnCloseIntegrationSettings) els.btnCloseIntegrationSettings.addEventListener("click", closeIntegrationSettingsModal);
      if (els.btnSaveIntegrationSettings) els.btnSaveIntegrationSettings.addEventListener("click", saveIntegrationSettingsFromModal);
      if (els.integrationSettingsModal) {
        els.integrationSettingsModal.addEventListener("click", (e) => {
          if (e.target === els.integrationSettingsModal) closeIntegrationSettingsModal();
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && els.integrationSettingsModal && els.integrationSettingsModal.classList.contains("flex")) {
            closeIntegrationSettingsModal();
            if (els.btnOpenIntegrationSettings) els.btnOpenIntegrationSettings.focus();
          }
        });
      }

      if (els.btnInstallApp) {
        els.btnInstallApp.addEventListener("click", triggerAppInstall);
      }

      if (els.proposalMode) {
        els.proposalMode.addEventListener("change", updateUI);
      }
      if (els.pdfInternalFormat) {
        els.pdfInternalFormat.addEventListener("change", updateUI);
      }
      if (els.advancedMode) {
        els.advancedMode.addEventListener("change", () => {
          trackEvent("calc_mode_toggle", { advancedMode: !!els.advancedMode.checked });
          updateUI();
        });
      }
      if (els.enableMonteCarlo) {
        els.enableMonteCarlo.addEventListener("change", updateUI);
      }
    }

    function setupTermsModal() {
      if (!els.termsModal || !els.termsScroll || !els.btnAcceptTerms) return;
      function checkScrollEnd() {
        const el = els.termsScroll;
        const atEnd = el.scrollHeight - el.scrollTop <= el.clientHeight + 2;
        els.btnAcceptTerms.disabled = !atEnd;
      }
      els.termsScroll.addEventListener("scroll", checkScrollEnd);
      window.addEventListener("resize", checkScrollEnd);
      try {
        new ResizeObserver(checkScrollEnd).observe(els.termsScroll);
      } catch (_) {
        debugSoftFallback("ResizeObserver indisponivel para termsScroll", _);
      }
      checkScrollEnd();

      function isFocusable(el) {
        if (!el) return false;
        if (el.disabled === true) return false;
        if (el.offsetParent === null && el !== document.body) return false;
        return true;
      }
      function getModalFocusables() {
        return [els.termsScroll, els.btnAcceptTerms].filter(isFocusable);
      }
      function trapFocus(e) {
        if (e.key !== "Tab") return;
        if (els.termsModal.style.display === "none") return;
        const focusables = getModalFocusables();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (focusables.length === 1) {
          e.preventDefault();
          if (document.activeElement !== first) first.focus();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      els.termsModal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          return;
        }
        trapFocus(e);
      });

      els.btnAcceptTerms.addEventListener("click", () => {
        const text = els.termsScroll.innerText || "";
        recordAcceptance({
          termsVersion: TERMS_VERSION,
          textChecksum: textChecksum(text),
          sessionId: getSessionId(),
          scrolled_to_end: true,
        });
        els.termsModal.style.display = "none";
        updateUI();
      });
      if (!hasAcceptedTerms()) {
        els.termsModal.style.display = "flex";
        checkScrollEnd();
        requestAnimationFrame(() => {
          els.termsScroll.focus();
        });
      }
    }

    const CLIENT_VIEW_SAFE_PARAMS = ["currency", "validityDate", "professionalName", "projectHours", "projectNet"];

    function isClientView() {
      try {
        const p = new URL(window.location.href).searchParams;
        return p.get("view") === "client";
      } catch (_) {
        return false;
      }
    }

    function initClientView() {
      const appContainer = document.getElementById("appContainer");
      const clientViewContainer = document.getElementById("clientViewContainer");
      const termsModal = document.getElementById("termsModal");
      if (!appContainer || !clientViewContainer) return;
      if (termsModal) termsModal.style.display = "none";
      appContainer.classList.add("hidden");
      clientViewContainer.classList.remove("hidden");

      const p = new URL(window.location.href).searchParams;
      const cvDefaults = { currency: "BRL", validityDate: "", professionalName: "", projectHours: 0, projectNet: 0, hoursPerDay: 0, utilization: 0 };
      const raw = {
        currency: p.get("currency") || "BRL",
        validityDate: (p.get("validityDate") || "").trim(),
        professionalName: (p.get("professionalName") || "").trim(),
        projectHours: toNum(p.get("projectHours")),
        projectNet: toNum(p.get("projectNet")),
        hoursPerDay: toNum(p.get("hoursPerDay")),
        utilization: toNum(p.get("utilization")),
      };
      const s = sanitizeState(cvDefaults, raw);
      const currency = sanitizeCurrency(s.currency);
      const validityDate = s.validityDate;
      const professionalName = s.professionalName;
      const projectHours = s.projectHours;
      const projectNet = s.projectNet;
      const hoursPerDay = s.hoursPerDay;
      const utilization = s.utilization;

      const setEl = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text || "â€”";
      };
      setEl("clientViewTotal", projectNet > 0 ? fmtMoney(projectNet, currency) : "â€”");
      let prazoText = "â€”";
      if (projectHours > 0) {
        if (hoursPerDay > 0 && utilization > 0) {
          const diasUteis = Math.ceil((projectHours / hoursPerDay) * (100 / utilization));
          prazoText = `${projectHours}h (~${diasUteis} dias Ãºteis)`;
        } else {
          prazoText = `${projectHours}h`;
        }
      }
      setEl("clientViewPrazo", prazoText);
      setEl("clientViewValidade", validityDate || "â€”");
      setEl("clientViewMoeda", currency);
      setEl("clientViewProfissional", professionalName || "â€”");
    }

    function setupTabs() {
      const strategistTab = document.getElementById("tab-strategist");
      const strategistEnabled = !!FEATURE_FLAGS.strategist_mode_enabled;
      if (strategistTab) strategistTab.classList.toggle("hidden", !strategistEnabled);
      currentUiMode = getCanonicalUiMode(currentUiMode);

      const tabs = TAB_IDS.map((id) => document.getElementById(id)).filter(Boolean);
      if (!tabs.length) return;

      const getVisibleIndexes = () => {
        const visible = [];
        tabs.forEach((tab, idx) => {
          if (!tab.classList.contains("hidden")) visible.push(idx);
        });
        return visible.length ? visible : [0];
      };

      const resolveIndexFromMode = (mode) => {
        const desired = UI_MODE_VALUES.indexOf(getCanonicalUiMode(mode));
        const visible = getVisibleIndexes();
        if (desired >= 0 && visible.includes(desired)) return desired;
        return visible[0];
      };

      const applyUiModeText = (idx) => {
        currentUiMode = UI_MODE_VALUES[idx] ?? "essencial";
        if (els.activeModeLabel) {
          const modeLabel = TAB_MODE_LABELS[idx] ?? "Essencial";
          safeText(els.activeModeLabel, `Modo ativo: ${modeLabel}`);
        }
        const hintEl = document.getElementById("tabContextHint");
        if (hintEl) safeText(hintEl, TAB_CONTEXT_HINTS[currentUiMode] ?? "");
      };

      const syncPanelByMode = () => {
        const negotiationCard = document.getElementById("negotiationConfigCard");
        if (negotiationCard) {
          negotiationCard.classList.toggle("hidden", currentUiMode !== "governanca");
        }
      };

      const activate = (idx, options) => {
        const opts = options || {};
        const safeIdx = resolveIndexFromMode(UI_MODE_VALUES[idx] ?? currentUiMode);

        tabs.forEach((tab, i) => {
          const selected = i === safeIdx;
          tab.setAttribute("aria-selected", selected ? "true" : "false");
          tab.tabIndex = selected ? 0 : -1;
          const panelId = tab.getAttribute("aria-controls");
          if (!panelId) return;
          const panel = document.getElementById(panelId);
          if (!panel) return;
          panel.classList.toggle("hidden", !selected);
          panel.classList.toggle("tab-panel-visible", !!selected);
          panel.setAttribute("aria-hidden", selected ? "false" : "true");
        });

        applyUiModeText(safeIdx);
        syncPanelByMode();

        if (opts.focus) tabs[safeIdx].focus();
        if (opts.persist !== false) persistState({ ...getStateFromInputs(), uiMode: currentUiMode });
      };

      activateUiModeTab = activate;
      resolveUiModeTabIndex = resolveIndexFromMode;

      tabs.forEach((tab, i) => {
        tab.addEventListener("click", () => activate(i, { persist: true }));
        tab.addEventListener("keydown", (e) => {
          const visible = getVisibleIndexes();
          const currentPos = visible.indexOf(i);
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const delta = e.key === "ArrowRight" ? 1 : -1;
            const nextPos = (currentPos + delta + visible.length) % visible.length;
            activate(visible[nextPos], { persist: true, focus: true });
            return;
          }
          if (e.key === "Home") {
            e.preventDefault();
            activate(visible[0], { persist: true, focus: true });
            return;
          }
          if (e.key === "End") {
            e.preventDefault();
            activate(visible[visible.length - 1], { persist: true, focus: true });
          }
        });
      });

      activate(resolveIndexFromMode(currentUiMode), { persist: false });
    }

    try {
      (function init() {
        const grid = document.getElementById("mainGrid");
        if (grid) grid.setAttribute("data-ui-split", FEATURE_FLAGS.ui_split_enabled ? "true" : "false");
        if (isClientView()) {
          initClientView();
          return;
        }
        const applied = applyQueryParams();
        if (!applied) {
          const saved = loadState();
          setInputsFromState(saved ? { ...defaultState(), ...saved } : defaultState());
        }
        wireEvents();
        applyButtonHelp();
        wireHelpToggles();
        setupTabs();
        setupWizard();
        setupPreviewAnchor();
        setupTrustBadges();
        setupMicroInteractions();
        setupMobileA11y();
        setupInstallPrompt();
        registerServiceWorker();
        applyBranding();
        setupTermsModal();
        renderScenariosComparison();
        updateUI();
      })();
    } catch (bootErr) {
      showBootError(bootErr, "Erro na inicialização");
    }
  })().catch((e) => showBootError(e, "Bootstrap"));













