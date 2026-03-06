# Fase 5 + Fase 6 – Entrega: Microinterações + Mobile/A11y

**Data:** 2025-03-02

---

## 1. Resumo

Implementação das Fases 5 e 6 com rollout seguro por flags: microinterações (validação, transições, feedback) e mobile + acessibilidade (barra inferior, teclado, ARIA, touch targets).

---

## 2. Flags

| Flag | Default | Escopo |
|------|---------|--------|
| `ui_micro_interactions_enabled` | `false` | Feedback de validação, transições wizard/tabs, animação de números, polish |
| `ui_mobile_a11y_enabled` | `false` | Barra mobile (quando wizard OFF), touch targets, Escape em modais |

**Regra:** OFF = comportamento atual intacto. ON = ativa apenas o bloco correspondente.

---

## 3. Fase 5 — Microinterações

### 3.1 Feedback de validação (suave)

- Inputs numéricos: no `blur`, borda verde sutil se válido, vermelha se fora de min/max
- Classes: `input-validation-valid`, `input-validation-invalid`
- Não aplicado no load inicial (apenas após interação)

### 3.2 Transição entre passos/tabs

- Wizard: fade entre passos (150ms) quando flag ON
- `prefers-reduced-motion: reduce` remove animações

### 3.3 Atualização de números

- Elementos principais (`hourlyRate`, `revenueTarget`, `projectPrice`, `resultProposalTotal`) com classe `micro-result-value`
- Transição leve (opacity) ao atualizar valor

### 3.4 Toasts

- Mantidos como estão (showToast existente)
- Sem duplicação

### 3.5 Polimento visual

- `focus-visible` já aplicado
- Hierarquia de CTA preservada

---

## 4. Fase 6 — Mobile + A11y

### 4.1 Mobile bottom bar

- Nova barra `mobileA11yBar` quando `ui_mobile_a11y_enabled=true` e `ui_wizard_enabled=false`
- Valor principal + CTA "Gerar PDF"
- `padding-bottom: env(safe-area-inset-bottom)` para iOS/Android
- Não conflita com wizard (wizard usa sua própria barra)
- **Teclado aberto:** quando input/textarea/select está focado, a barra é ocultada (classe `input-focused` em body) para não cobrir campo/CTA em Android/iOS

### 4.2 Navegação por teclado

- Escape fecha modais (terms, premium, integration) e devolve foco ao gatilho
- Dropdown Ferramentas: Escape fecha e foca btnToolsToggle (já existia)
- Tabs: setas, Home, End (já existia)

### 4.3 Semântica ARIA

- `aria-expanded`, `aria-controls`, `aria-hidden` já presentes
- Ícones decorativos com `aria-hidden="true"` (trust badges)

### 4.4 Contraste

- Textos e foco mantêm contraste AA

### 4.5 Touch targets

- Classe `mobile-a11y-touch` (min 44×44px) em botões principais quando flag ON
- Aplicado a: PDF, Ferramentas, barra mobile

---

## 5. Checagens finais

### 5.1 Paridade com flags OFF

- `ui_micro_interactions_enabled=false, ui_mobile_a11y_enabled=false`: comportamento idêntico ao anterior
- Sem classes de validação, transições ou micro-animações
- Sem barra mobile, sem touch targets extras
- Sem listeners de focus (input-focused)

### 5.2 Mobile + teclado aberto

- `focusin` em input/textarea/select → body recebe `input-focused` → barra oculta
- `focusout` para elemento não-input → `input-focused` removido → barra retorna
- Barra e padding não cobrem campo focado em Android/iOS

---

## 6. Arquivos alterados

| Arquivo | Mudanças |
|---------|----------|
| `index.html` | Flags, CSS Fase 5/6, mobileA11yBar HTML, setupMicroInteractions, setupMobileA11y, focusin/focusout para teclado (input-focused), Escape integration modal, safeText com micro-result-value |

---

## 7. Validação

| Teste | Resultado |
|-------|-----------|
| `npm test` | 8 suites, 66 testes passando |
| `node scripts/smoke-routes.mjs https://calculadora-freelancer-orpin.vercel.app` | GO-LIVE READY |

---

## 8. Compatibilidade

- `view=client`: intacta
- share/export/import: intactos
- termos/compliance: intactos
- PDFs: intactos
- wizard/proposalMode: intactos
- IDs existentes: preservados

---

## 9. Veredito

**GO-LIVE READY**
