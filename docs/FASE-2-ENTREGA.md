# Fase 2 – Entrega: Wizard 3 Passos

**Data:** 2025-03-02  
**Status:** Concluído

---

## 1. Arquivos alterados

| Arquivo | Alterações |
|---------|------------|
| `index.html` | Flag, estrutura wizard, bottom bar, lógica JS |

---

## 2. Resumo do patch

### 2.1 Flag
- `ui_wizard_enabled: false` em FEATURE_FLAGS
- Quando `false`: paridade total com UI atual (todos os passos visíveis, nav oculto)
- Quando `true`: wizard em 3 passos ativo

### 2.2 Estrutura wizard
- **Passo 1**: Dados básicos (targetIncome, monthlyCosts, taxRate, profitMargin, buffer, utilization, hoursPerDay, daysPerWeek, vacationWeeks)
- **Passo 2**: Estratégia (professionalName, clientName, validityDate, projectHours, scopeRisk, discount)
- **Passo 3**: Fechamento (projectPrice, proposalText, btnCopyProposal, btnPdf)

### 2.3 Comportamento
- Avançar/Voltar sempre permitidos
- Aviso contextual ao avançar do Passo 1 com dados incompletos: "Faltam campos para cálculo completo. Avançar mesmo assim."
- "Ir para Avançado" rola até a tablist
- Estado preservado entre passos (inputs mantêm IDs, getStateFromInputs/setInputsFromState inalterados)

### 2.4 Mobile
- Bottom Bar fixa: visível apenas em sm (mobile), `sm:hidden`
- Valor principal: taxa/hora ou preço projeto
- CTA "Gerar PDF" com estado disabled conforme validação
- `padding-bottom` em main quando bar visível
- `safe-area-inset-bottom` para dispositivos com notch

### 2.5 IDs preservados
- Todos os inputs e botões mantêm IDs originais
- Novos: wizardContainer, wizardStep1/2/3, wizardStepIndicator, wizardNav, btnWizardPrev/Next/Advanced, wizardBottomBar, wizardBottomBarValue, btnWizardBottomPdf

---

## 3. Não regressão

- [x] `compute` / `projectNet` não alterados
- [x] `view=client` preservado
- [x] share / export / import preservados
- [x] termos / compliance / rotas preservados
- [x] PDFs não alterados
- [x] getStateFromInputs / setInputsFromState inalterados

---

## 4. Resultados de validação

| Validação | Resultado |
|-----------|-----------|
| **npm test** | 8 suites, 66 testes passando |
| **Smoke rotas** | GO-LIVE READY |

---

## 5. Verificações manuais sugeridas

1. `ui_wizard_enabled=false`: paridade total
2. `ui_wizard_enabled=true`: preencher passo 1 → avançar → voltar → dados intactos
3. Mobile: bottom bar visível, valor atualiza em tempo real
4. `view=client`: continua isolada

---

## 6. Veredito

**GO-LIVE READY**
