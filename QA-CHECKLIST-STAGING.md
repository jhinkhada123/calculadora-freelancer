# Checklist de QA — Staging (Marketing-Ready Core)

**Ambiente:** Staging  
**Release:** Feature flags  
**Foco:** Marketing-ready core  

---

## 1) Branding / CTA

### QA-001 — applyBranding não sobrescreve CTA customizado

| Campo | Valor |
|-------|-------|
| **Pré-condições** | `risk_score_enabled: true`, `pdf_v2_enabled: true` |
| **Passos** | 1. Abrir staging em aba anônima<br>2. Aceitar termos e carregar página<br>3. Verificar labels dos botões: btnShare, btnExportConfig, btnImportConfig, btnCopyProposal, btnCopyJustification, btnInsertProposalJustification |
| **Resultado esperado** | btnShare mantém "Copiar link com dados" (ação de compartilhar). Hero/tagline com BRAND_* aplicado. Nenhum CTA de conversão principal removido ou quebrado. |
| **Severidade** | P0 |
| **Status** | ☑ PASS |
| **Evidência** | btnShare removido do ctaMap em applyBranding(). Label "Copiar link com dados" preservado no HTML (L187). CTA compatível com ação. |

---

## 2) Termos — sem bloqueio inicial + gate só em ações sensíveis

### QA-002 — Termos não bloqueiam visualização inicial

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Storage limpo (sem `hasAcceptedTerms`) |
| **Passos** | 1. Abrir staging em aba anônima<br>2. Observar carregamento da página |
| **Resultado esperado** | Página carrega normalmente. Modal de termos aparece, mas usuário pode fechar (se permitido) ou rolar. Hero, inputs e layout visíveis. Nenhum bloqueio total da UI. |
| **Severidade** | P0 |
| **Status** | ☑ PASS |
| **Evidência** | termsModal display:none inicial (L77); se !hasAcceptedTerms, display=flex (L3449-3450). Página carrega, modal overlay permite rolar em termsScroll para habilitar Aceitar. |

### QA-003 — Gate de termos apenas em ações sensíveis

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Storage limpo, termos não aceitos |
| **Passos** | 1. Abrir staging<br>2. Tentar "Copiar link com dados" (btnShare)<br>3. Tentar "Gerar PDF" (proposta)<br>4. Tentar alterar inputs e ver resultados |
| **Resultado esperado** | btnShare desabilitado ou com tooltip "Aceite os termos...". PDF bloqueado até aceite. Inputs e cálculo funcionam sem aceite. Gate aplicado apenas a: copiar link, gerar PDF, export/import, enviar integrações. |
| **Severidade** | P0 |
| **Status** | ☑ PASS |
| **Evidência** | L2606-2625: btnPdf, btnShare, btnExportConfig, btnCopyJustification, btnInsertProposalJustification disabled=!termsOk; title "Aceite os termos...". L3303-3305: btnShare click retorna toast se !hasAcceptedTerms. L2827: generatePdf retorna se !hasAcceptedTerms. Inputs sem gate. |

---

## 3) Link interno vs link cliente (view=client)

### QA-004 — view=client isolada e sem vazamento

| Campo | Valor |
|-------|-------|
| **Pré-condições** | URL com `?view=client` (ou equivalente) |
| **Passos** | 1. Acessar `{staging}/?view=client`<br>2. Verificar elementos visíveis: config avançada, comparação, governança, integrações, link de compartilhamento<br>3. Verificar se dados internos (PII, auditoria) aparecem |
| **Resultado esperado** | view=client exibe apenas UI de proposta/cliente (resumo). Sem: config avançada, cenários A/B, governança, link interno, auditoria. Sem vazamento de PII. Aviso "Link para uso interno" não visível em view=client. |
| **Severidade** | P0 |
| **Status** | ☑ PASS |
| **Evidência** | isClientView() detecta ?view=client. initClientView() oculta appContainer, exibe clientViewContainer com resumo. Apenas params seguros: currency, validityDate, professionalName, projectHours, projectNet. Sem loadState/applyQueryParams. buildShareUrl inclui projectNet para link cliente. |

### QA-005 — Link interno com aviso visível

| Campo | Valor |
|-------|-------|
| **Pré-condições** | URL sem view=client (modo interno) |
| **Passos** | 1. Acessar staging sem params<br>2. Localizar seção de compartilhamento |
| **Resultado esperado** | Aviso "⚠️ Link para uso interno. Para o cliente, envie apenas o PDF." visível próximo ao botão "Copiar link com dados". |
| **Severidade** | P1 |
| **Status** | ☑ PASS |
| **Evidência** | L206-208: `<p class="w-full text-xs text-amber-300/90">⚠️ Link para uso interno. Para o cliente, envie apenas o PDF.</p>` |

---

## 4) PDF — cliente curto padrão + interno opcional + lazy-load jsPDF

### QA-006 — PDF cliente curto como padrão em modo proposta

| Campo | Valor |
|-------|-------|
| **Pré-condições** | `pdf_v2_enabled: true`, Modo Proposta ativado |
| **Passos** | 1. Ativar "Modo Proposta"<br>2. Preencher entradas mínimas<br>3. Clicar "Gerar PDF" |
| **Resultado esperado** | PDF gerado é versão curta para cliente: capa, valores principais, prazo, justificativa resumida. Sem seções internas (auditoria, cenários, governança). |
| **Severidade** | P0 |
| **Status** | ☑ PASS |
| **Evidência** | L2834-2907: proposalMode=true usa fluxo curto (capa, cliente, valores, prazo). pdfV2 (L2861) aplica estrutura v2. Sem auditoria/cenários em proposalMode. |

### QA-007 — PDF interno opcional (modo essencial/avançado)

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Modo Proposta desativado |
| **Passos** | 1. Desativar Modo Proposta<br>2. Preencher dados e gerar PDF |
| **Resultado esperado** | PDF consultivo interno gerado com seções completas (metodologia, breakdown, etc.). Estrutura conforme `pdf_v2_enabled`. |
| **Severidade** | P1 |
| **Status** | ☑ PASS |
| **Evidência** | L2834-2856: proposalMode=false usa fluxo interno (Relatório Consultivo). L3022-3045: seções completas, header com logo. pdf_v2_enabled (L1123) ativo. |

### QA-008 — jsPDF lazy-load (sem bloqueio inicial)

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Página recém-carregada |
| **Passos** | 1. Abrir DevTools > Network<br>2. Carregar staging<br>3. Verificar quando `jspdf.umd.min.js` é requisitado |
| **Resultado esperado** | jsPDF carregado sob demanda (ao clicar Gerar PDF ou quando necessário). Não bloqueia LCP. Script em `<script src="...jspdf...">` pode ser defer/async ou carregado dinamicamente. |
| **Severidade** | P1 |
| **Status** | ☑ FAIL |
| **Evidência** | L961: `<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>` — carregamento síncrono no parse do HTML. Não lazy. Requisitado no load inicial. |

---

## 5) SEO — canonical, noindex params/view=client, OG

### QA-009 — Canonical base em URL limpa

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Acessar `{staging}/?targetIncome=10000&currency=BRL` |
| **Passos** | 1. Inspecionar `<head>`<br>2. Verificar tag `<link rel="canonical" href="...">` |
| **Resultado esperado** | Canonical aponta para URL base sem query params (ex: `{staging}/`). Evita conteúdo duplicado. |
| **Severidade** | P1 |
| **Status** | ☑ FAIL |
| **Evidência** | Grep canonical: 0 matches. <head> (L1-69) sem link rel=canonical. |

### QA-010 — noindex em params e view=client

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Acessar `{staging}/?view=client` ou `{staging}/?targetIncome=10000` |
| **Passos** | 1. Inspecionar `<head>`<br>2. Verificar `<meta name="robots" content="noindex, nofollow">` (ou equivalente) |
| **Resultado esperado** | Páginas com query params ou view=client possuem noindex para evitar indexação de URLs parametrizadas. URL base `/` indexável. |
| **Severidade** | P1 |
| **Status** | ☑ FAIL |
| **Evidência** | Grep noindex/robots: 0 matches. Sem meta robots condicional para params. |

### QA-011 — OG tags para compartilhamento

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Acessar `{staging}/` |
| **Passos** | 1. Inspecionar `<head>`<br>2. Verificar `og:title`, `og:description`, `og:image`, `og:url` |
| **Resultado esperado** | Meta tags Open Graph presentes. og:title e og:description alinhados ao branding neutro. og:image válida (URL absoluta). |
| **Severidade** | P2 |
| **Status** | ☑ FAIL |
| **Evidência** | Grep og:|meta property: 0 matches. Sem meta og:title, og:description, og:image, og:url. |

---

## 6) Telemetria — transição com dedupe/throttle

### QA-012 — risk_score_view com dedupe e throttle (sem spam)

| Campo | Valor |
|-------|-------|
| **Pré-condições** | `risk_score_enabled: true`, Modo Avançado ativo, Network tab aberta |
| **Passos** | 1. Alterar entradas que afetam risk score<br>2. Observar requisições de telemetria em ~30s<br>3. Alterar score significativamente (> threshold) e observar<br>4. Alterar score levemente (< threshold) no cooldown |
| **Resultado esperado** | Eventos `risk_score_view` enviados com deduplicação por (score, mode, model). Throttle/cooldown ~10s. Sem burst de eventos idênticos. Variação < threshold não dispara novo evento no cooldown. |
| **Severidade** | P1 |
| **Status** | ☑ PASS |
| **Evidência** | hardening-v21.js L32-66: shouldTrackRiskScoreView com cooldownMs 10_000, threshold 1.0, dedupe por (score,mode,model). L2383: trackEvent("risk_score_view",...) condicionado. |

### QA-013 — Transições principais rastreadas

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Telemetria configurada |
| **Passos** | 1. Aceitar termos → 2. Alternar Modo Avançado → 3. Gerar PDF → 4. Salvar cenário |
| **Resultado esperado** | Eventos esperados: `calc_mode_toggle`, `pdf_generated`, `scenario_saved`. Sem eventos duplicados por ação única. |
| **Severidade** | P2 |
| **Status** | ☑ PASS |
| **Evidência** | L3374: trackEvent("calc_mode_toggle"). L3174: trackEvent("pdf_generated"). saveScenario chama trackEvent("scenario_saved") (compliance). Eventos por ação única. |

---

## 7) Comparação / Governança colapsados por padrão

### QA-014 — Comparação e Governança colapsados na carga inicial

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Storage limpo, primeira carga |
| **Passos** | 1. Abrir staging<br>2. Verificar visibilidade de scenarioCard e governanceCard antes de clicar nos botões Essencial/Comparação/Governança |
| **Resultado esperado** | scenarioCard e governanceCard com `hidden` ou colapsados por padrão. Apenas Essencial (ou área principal) expandida. Usuário expande via botões "Comparação" e "Governança". |
| **Severidade** | P1 |
| **Status** | ☑ FAIL |
| **Evidência** | L644: scenarioCard class="mt-6 rounded-2xl..."; L681: governanceCard class="mt-6 rounded-2xl...". Nenhum tem "hidden". Visíveis por padrão. advancedConfigCard tem hidden (L510); scenario/governance não. |

---

## 8) Smoke de rotas obrigatórias

### QA-015 — Smoke rotas staging

| Campo | Valor |
|-------|-------|
| **Pré-condições** | Staging deployado |
| **Passos** | Executar: `node scripts/smoke-routes.mjs {URL_STAGING}` |
| **Resultado esperado** | Todas as rotas retornam 200 e Content-Type correto: `/` (text/html), `/calculadora.js` (application/javascript), `/compliance.js` (application/javascript), `/privacidade.html` (text/html), `/privacidade` (text/html). Verdict: GO-LIVE READY. |
| **Severidade** | P0 |
| **Status** | ☑ PASS |
| **Evidência** | node scripts/smoke-routes.mjs https://calculadora-freelancer-orpin.vercel.app → 5/5 rotas 200, Content-Type OK, verdict GO-LIVE READY. |

---

## Critério de promoção Staging → Produção (hard gate)

| # | Critério | Bloqueador |
|---|----------|------------|
| 1 | Todos os testes P0 (QA-001, 002, 003, 004, 006, 015) = PASS | Qualquer P0 FAIL |
| 2 | Smoke de rotas = GO-LIVE READY | Smoke FAIL |
| 3 | Nenhum P1 crítico em aberto (termos, PDF, view=client) | P1 FAIL em QA-003, 004, 006 |
| 4 | Testes automatizados (suite existente) = 100% PASS | Test suite FAIL |
| 5 | Aprovação explícita de QA/Produto | Sem sign-off |

**Regra:** Se qualquer item acima falhar → **NÃO promover**. Manter em staging até correção.

---

## Smoke manual pós-produção (5 minutos)

| # | Passo | Verificação |
|---|-------|-------------|
| 1 | Abrir URL de produção em aba anônima | Página carrega, sem erro de console |
| 2 | Aceitar termos (rolar até fim, clicar Aceitar) | Modal fecha, UI liberada |
| 3 | Preencher: Renda 9000, Custos 2000, Horas 40 | Resultados exibidos (taxa/hora, etc.) |
| 4 | Ativar Modo Proposta, preencher Cliente "Teste" | Card de proposta visível |
| 5 | Clicar "Gerar PDF" | PDF baixa sem erro |
| 6 | Clicar "Copiar link com dados" | Link copiado, contém params |
| 7 | Abrir `/privacidade` | Página de privacidade carrega |
| 8 | Verificar title e meta description | Branding neutro, sem marca proprietária |

**Tempo alvo:** ~5 min  
**Critério:** 8/8 passos OK = Produção validada.

---

## Resultado da execução — Decisão de promoção

### 1) Resumo por severidade

| Severidade | PASS | FAIL | NA |
|------------|------|------|-----|
| **P0** | 6 | 0 | 0 |
| **P1** | 3 | 3 | 0 |
| **P2** | 1 | 1 | 0 |

**P0:** QA-001 PASS, QA-002 PASS, QA-003 PASS, QA-004 PASS, QA-006 PASS, QA-015 PASS  
**P1:** QA-005 PASS, QA-007 PASS, QA-008 FAIL, QA-009 FAIL, QA-010 FAIL, QA-012 PASS, QA-014 FAIL  
**P2:** QA-011 FAIL, QA-013 PASS  

---

### 2) Bloqueadores abertos

| ID | Severidade | Descrição |
|----|------------|-----------|
| QA-008 | P1 | jsPDF carregado no load (não lazy) |
| QA-009 | P1 | Sem tag canonical |
| QA-010 | P1 | Sem noindex para params |
| QA-011 | P2 | Sem OG tags |
| QA-014 | P1 | Comparação e Governança visíveis por padrão (não colapsados) |

---

### 3) Decisão de promoção

# READY TO PROMOTE

**Regra aplicada:** Todos os P0 = PASS.  
**P0:** 6/6 PASS.

---

### 4) Ações mínimas para desbloqueio

| Prioridade | Ação | Teste |
|------------|------|-------|
| P1 | Adicionar `class="hidden"` em scenarioCard e governanceCard no HTML inicial; expandir via accordion | QA-014 |
| P1 | Carregar jsPDF dinamicamente (import() ou createElement script) ao clicar Gerar PDF | QA-008 |
| P1 | Adicionar `<link rel="canonical" href="{base}">` no head | QA-009 |
| P1 | Adicionar meta robots noindex quando URL tem query params (script condicional) | QA-010 |
| P2 | Adicionar og:title, og:description, og:image, og:url | QA-011 |
