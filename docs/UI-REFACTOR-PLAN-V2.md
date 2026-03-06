# Plano de Refatoração UI/UX v2 – Entregável para Aprovação

**Status:** Aguardando aprovação para codar Fase 1  
**Data:** 2025-03-02

---

## 1. Estratégia de Rollout (flags separadas)

| Flag | Default | Escopo | Rollback |
|------|---------|--------|----------|
| `ui_split_enabled` | `false` | Layout split-screen desktop | Desativa grid 2 colunas |
| `ui_wizard_enabled` | `false` | Fluxo 3 passos com desbloqueio leve | Volta para layout único |
| `ui_preview_anchor_enabled` | `false` | Reordenação valor/prazo/preço no preview | (Fase posterior) |
| `ui_trust_badges_enabled` | `false` | Trust badges perto do CTA | (Fase posterior) |

**Regra:** Rollback por bloco. Cada flag controla um bloco independente.

---

## 2. Escopo por Fase (enxuto)

| Fase | Conteúdo | Flags | Adiado |
|------|----------|-------|--------|
| **Fase 1** | Split-screen desktop | `ui_split_enabled` | — |
| **Fase 2** | Wizard 3 passos (desbloqueio leve) | `ui_wizard_enabled` | — |
| **Posterior** | Visual high-end, microinterações, trust badges | `ui_preview_anchor_enabled`, `ui_trust_badges_enabled` | Sim |

---

## 3. Progressive Disclosure sem Bloqueio Duro

- **Passo 2/3**: não travados rigidamente.
- **Avançar**: sempre permitido; se faltar dado, exibir aviso contextual:
  - "Faltam campos para cálculo completo. Avançar mesmo assim?"
- **Objetivo**: reduzir fricção para iniciantes, não punir usuários experientes.
- **Implementação**: botão "Avançar" sempre clicável; toast/aviso leve quando `!r.ok` ou dados incompletos.

---

## 4. Avançado com Discoverability

- **Atalho explícito visível**: "Ir para Avançado" / "Abrir opções avançadas"
- **Estrategista / Comparação / Governança**: permanecem acessíveis fora do fluxo principal (tabs ou link).
- **Não esconder**: link/botão sempre visível no rodapé do wizard ou no header.

---

## 5. Gates de Merge (não regressão)

Merge **bloqueado** se qualquer item falhar:

- [ ] `compute` / `projectNet` alterados semanticamente
- [ ] `view=client` quebrado
- [ ] share / export / import quebrados
- [ ] termos / compliance / rotas alterados indevidamente
- [ ] PDF cliente/interno com regressão funcional
- [ ] `npm test` falhar
- [ ] `node scripts/smoke-routes.mjs` falhar

---

## 6. Métricas Objetivas por Fase

| Métrica | Fase 1 | Fase 2 | Como medir |
|---------|--------|--------|------------|
| Tempo até primeiro cálculo válido | Baseline | Comparar | Timer no load → primeiro `r.ok` |
| Taxa de avanço Passo 1 → Passo 2 | — | ≥ baseline | Evento `wizard_step_2_reached` |
| Taxa de geração PDF após Passo 3 | — | ≥ baseline | Evento `pdf_generated` com `wizardComplete` |
| Queda/erro por etapa | 0 | 0 | Console errors, trackEvent de erro |

**Regra:** Sem métrica reportada, não avançar de fase.

---

## 7. Estrutura Funcional – Fase 1 (Split-Screen)

### 7.1 Wireframe Desktop (quando `ui_split_enabled=true`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (inalterado)                                                              │
├─────────────────────────────────────────────┬───────────────────────────────────┤
│  ESQUERDA (inputs) lg:col-span-7             │  DIREITA (preview) lg:col-span-5  │
│  ─────────────────────────────              │  ─────────────────────────────    │
│  <section> (existente)                       │  <aside> (existente)              │
│  • Entradas, Moeda, Tabs                     │  • sticky top-6                   │
│  • configWrapper, essentialArea              │  • resultCardsInternal           │
│  • panel-essential, panel-premium, etc.      │  • resultCardProposal             │
│  • Todo o conteúdo atual                     │  • Composição, Alertas, etc.      │
│                                              │  • CTA PDF                        │
└─────────────────────────────────────────────┴───────────────────────────────────┘
```

**Mudança:** Apenas garantir que o grid `lg:grid-cols-12` e `lg:col-span-7` / `lg:col-span-5` estejam corretos. **Estrutura atual já é split** (`section lg:col-span-7` + `aside lg:col-span-5`). Fase 1 = ativar/ajustar quando flag ON.

### 7.2 Mapeamento de IDs – Fase 1

| ID Atual | Container | Ação Fase 1 |
|----------|------------|-------------|
| `configWrapper` | Dentro de `essentialArea` | Manter, sem alteração |
| `essentialArea` | Dentro de `panel-essential` | Manter |
| `resultCardsInternal` | Dentro de `aside` | Manter |
| `resultCardProposal` | Dentro de `aside` | Manter |
| `currency` | Header do card Entradas | Manter |
| `activeModeLabel` | Acima das tabs | Manter |
| `tab-essential`, `tab-strategist`, etc. | Tablist | Manter |
| `panel-essential`, `panel-premium`, etc. | Tabpanels | Manter |

**Conclusão Fase 1:** Nenhum ID alterado. Apenas classes CSS condicionais ao `ui_split_enabled` (ex.: garantir `aside` com `sticky` e proporções corretas em lg+).

---

## 8. Estrutura Funcional – Fase 2 (Wizard 3 Passos)

### 8.1 Wireframe Wizard (quando `ui_wizard_enabled=true`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (inalterado)                                                              │
├─────────────────────────────────────────────┬───────────────────────────────────┤
│  WIZARD (esquerda)                           │  PREVIEW (direita, igual Fase 1)  │
│  ─────────────────                          │  ─────────────────────────────    │
│  Indicador: Passo 1 de 3 | 2 de 3 | 3 de 3  │  (conteúdo inalterado)            │
│                                             │                                    │
│  PASSO 1: Dados básicos                     │                                    │
│  • targetIncome, monthlyCosts               │                                    │
│  • taxRate, profitMargin, buffer            │                                    │
│  • utilization, hoursPerDay, daysPerWeek    │                                    │
│  • vacationWeeks                           │                                    │
│  [Avançar →]  [Ir para Avançado]            │                                    │
│                                             │                                    │
│  PASSO 2: Estratégia (oculto até avançar)   │                                    │
│  • projectHours, scopeRisk, discount        │                                    │
│  • professionalName, clientName, validityDate│                                    │
│  [← Voltar] [Avançar →] [Ir para Avançado]  │                                    │
│                                             │                                    │
│  PASSO 3: Fechamento (oculto até avançar)   │                                    │
│  • Resumo + proposalText (read-only)        │                                    │
│  • CTA Gerar PDF (duplicado do header)      │                                    │
│  [← Voltar] [Ir para Avançado]              │                                    │
└─────────────────────────────────────────────┴───────────────────────────────────┘
```

### 8.2 Mapeamento de IDs – Fase 2

| ID Atual | Novo Container (wizard) | Preservar ID? |
|----------|-------------------------|---------------|
| `configWrapper` | `wizardStep1` (wrapper) | Sim – `configWrapper` permanece como filho |
| — | `wizardStep2` (novo) | — |
| — | `wizardStep3` (novo) | — |
| `targetIncome` | Dentro de `wizardStep1` | **Sim** |
| `monthlyCosts` | Dentro de `wizardStep1` | **Sim** |
| `taxRate`, `profitMargin`, `buffer` | Dentro de `wizardStep1` | **Sim** |
| `utilization`, `hoursPerDay`, `daysPerWeek`, `vacationWeeks` | Dentro de `wizardStep1` | **Sim** |
| `projectHours`, `scopeRisk`, `discount` | Dentro de `wizardStep2` | **Sim** |
| `professionalName`, `clientName`, `validityDate` | Dentro de `wizardStep2` | **Sim** |
| `proposalText`, `projectPrice` | Dentro de `wizardStep3` (ou referência) | **Sim** |
| `btnWizardNext` | Novo | — |
| `btnWizardPrev` | Novo | — |
| `btnWizardAdvanced` | Novo ("Ir para Avançado") | — |
| `wizardStepIndicator` | Novo ("Passo 1 de 3") | — |

**Regra:** Todos os inputs mantêm seus IDs. Apenas wrappers novos (`wizardStep1`, `wizardStep2`, `wizardStep3`) agrupam o conteúdo. `getStateFromInputs` e `setInputsFromState` continuam funcionando sem alteração.

### 8.3 Lógica de Desbloqueio Leve (Fase 2)

| Passo | Pode avançar? | Aviso se incompleto |
|-------|---------------|----------------------|
| 1 → 2 | Sempre | Toast: "Faltam campos para cálculo completo. Avançar mesmo assim?" (apenas se `!r.ok`) |
| 2 → 3 | Sempre | Idem |
| 3 | — | CTA PDF desabilitado se `!pdfOk` (comportamento atual) |

**Implementação:** `wizardCurrentStep` (1, 2 ou 3). Botão "Avançar" incrementa. Botão "Voltar" decrementa. Sem `disabled` no botão Avançar.

---

## 9. Lista de Mudanças em `index.html` (compatibilidade preservada)

### Fase 1

| Arquivo | Mudança | Compatibilidade |
|---------|---------|-----------------|
| `index.html` | Adicionar `ui_split_enabled: false` em FEATURE_FLAGS | ✅ |
| `index.html` | Se flag ON: aplicar classes `lg:grid-cols-12` (já existe), garantir `aside` com `sticky top-6` | ✅ |
| `index.html` | Wrapper condicional: `class="... ${ui_split_enabled ? 'flex flex-col lg:flex-row lg:gap-8' : ''}"` no container main | ✅ |
| — | Nenhum ID alterado | ✅ |
| — | Nenhuma lógica de cálculo alterada | ✅ |

### Fase 2

| Arquivo | Mudança | Compatibilidade |
|---------|---------|-----------------|
| `index.html` | Adicionar `ui_wizard_enabled: false` em FEATURE_FLAGS | ✅ |
| `index.html` | Se flag ON: envolver `configWrapper` em `wizardStep1`, criar `wizardStep2` e `wizardStep3` com conteúdo movido (não removido) | ✅ |
| `index.html` | Inputs movidos para dentro de steps; IDs preservados | ✅ |
| `index.html` | Adicionar `btnWizardNext`, `btnWizardPrev`, `btnWizardAdvanced`, `wizardStepIndicator` | ✅ |
| `index.html` | Lógica `wizardCurrentStep`, handlers de Avançar/Voltar | ✅ |
| `index.html` | Quando flag OFF: renderizar layout atual (configWrapper visível, sem steps) | ✅ |
| — | `getStateFromInputs` inalterado | ✅ |
| — | `setInputsFromState` inalterado | ✅ |
| — | Tabs (Essencial, Estrategista, etc.) permanecem; "Ir para Avançado" foca/ativa tab Essencial com conteúdo avançado visível | ✅ |

---

## 10. Plano de Testes por Fase

### Fase 1

| Teste | Tipo | Critério |
|-------|------|----------|
| Layout com flag OFF | Manual | Idêntico ao atual |
| Layout com flag ON (desktop lg+) | Manual | Split visível, aside sticky |
| Layout com flag ON (mobile) | Manual | Stacked, sem quebra |
| `npm test` | Automatizado | Todos passam |
| `node scripts/smoke-routes.mjs` | Automatizado | GO-LIVE READY |
| view=client | Manual | URL `?view=client&...` renderiza cliente |
| Share | Manual | Link copiado, parâmetros corretos |
| Export/Import | Manual | Exportar e importar sem perda |
| PDF interno e cliente | Manual | Gerar ambos, sem regressão |

### Fase 2

| Teste | Tipo | Critério |
|-------|------|----------|
| Wizard com flag OFF | Manual | Layout atual (Fase 1 ou original) |
| Wizard com flag ON | Manual | 3 passos visíveis, Avançar/Voltar funcionam |
| Avançar com dados incompletos | Manual | Toast de aviso, passo muda |
| "Ir para Avançado" | Manual | Tabs avançadas acessíveis |
| Persistência de state | Manual | Recarregar página, state preservado |
| `npm test` | Automatizado | Todos passam |
| Smoke | Automatizado | GO-LIVE READY |
| Gates de merge | Checklist | Todos os itens verificados |

---

## 11. Resumo para Aprovação

- **Fase 1**: Ativar layout split via `ui_split_enabled`; estrutura atual já suporta. Mudanças mínimas em CSS/classes.
- **Fase 2**: Wizard 3 passos com wrappers novos; IDs de inputs preservados; desbloqueio leve (aviso, não bloqueio).
- **Compatibilidade**: Nenhuma alteração em `compute`, `projectNet`, `getStateFromInputs`, `setInputsFromState`, view=client, share, export/import, termos, rotas, PDFs.
- **Rollback**: Por flag. `ui_split_enabled=false` e `ui_wizard_enabled=false` restauram comportamento atual.

**Aguardando aprovação para codar Fase 1.**
