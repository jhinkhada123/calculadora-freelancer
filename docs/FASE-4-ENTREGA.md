# Fase 4 – Entrega: Ancoragem de valor + Trust badges

**Data:** 2025-03-02

---

## 1. Resumo

Implementação da Fase 4 com rollout seguro por flags: ancoragem de valor no preview e trust badges próximos ao CTA de PDF.

---

## 2. Flags

| Flag | Default | Escopo |
|------|---------|--------|
| `ui_preview_anchor_enabled` | `false` | Reordenação do preview (valor → prazo → investimento → CTA) |
| `ui_trust_badges_enabled` | `false` | Bloco de confiança perto do CTA PDF |

**Regra:** OFF = comportamento atual intacto. ON = ativa apenas o bloco correspondente.

---

## 3. Escopo 1 — Ancoragem (ui_preview_anchor_enabled)

### 3.1 Reordenação do preview

**resultCardsInternal (modo essencial):**
- Ordem: 1) Taxa/hora (valor principal), 2) Capacidade (taxa/dia + horas faturáveis), 3) Faturamento alvo, 4) CTA PDF
- CTA PDF (`resultCardsCtaBlock`) visível apenas quando flag ON

**resultCardProposal (modo proposta):**
- Ordem: 1) Valor/ganho esperado, 2) Prazo, 3) Investimento, 4) CTA PDF
- Bloco "Valor/ganho esperado" sempre visível quando flag ON:
  - Com dados estratégicos: exibe valor formatado
  - Sem dados: fallback "Preencha dados estratégicos para estimar."

### 3.2 Apresentação

- Valor percebido em tom emerald (border/bg emerald-500)
- Preço legível e forte, posicionado após valor/prazo
- Sem alteração em `compute`, `projectNet` ou fórmulas

---

## 4. Escopo 2 — Trust badges (ui_trust_badges_enabled)

### 4.1 Itens

- Dados salvos no navegador
- Sem cadastro obrigatório
- Metodologia transparente

### 4.2 Implementação

- Bloco `trustBadgesBlock` dentro do card de preview
- Visual discreto (11px, cor slate)
- Ícones ✓ com `aria-hidden="true"`
- `role="list"` no container

---

## 5. Arquivos alterados

| Arquivo | Mudanças |
|---------|----------|
| `index.html` | Flags, HTML trust badges, lógica valor/ganho com fallback, correção `termsOk`, CSS |

---

## 6. Validação

| Teste | Resultado |
|-------|-----------|
| `npm test` | 8 suites, 66 testes passando |
| `node scripts/smoke-routes.mjs https://calculadora-freelancer-orpin.vercel.app` | GO-LIVE READY |
| `node scripts/smoke-routes.mjs http://127.0.0.1:3000` | GO-LIVE READY |

---

## 7. Compatibilidade

- `view=client`: intacta
- share/export/import: intactos
- termos/compliance: intactos
- PDFs: intactos
- wizard/proposalMode: intactos
- IDs existentes: preservados

---

## 8. Veredito

**GO-LIVE READY**
