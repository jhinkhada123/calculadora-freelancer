# Feature Flags — Estado padrão (baseline v2.2)

**Local:** `index.html` → `FEATURE_FLAGS` (linha ~1458)

---

## Estado padrão (default)

| Flag | Default | Escopo |
|------|---------|--------|
| `risk_score_enabled` | **ON** | Card de auditoria, score de risco |
| `pdf_v2_enabled` | **ON** | Estrutura PDF v2 |
| `strategist_mode_enabled` | **OFF** | Modo Estrategista (VCE, ROIx, CDO) |
| `pdf_impact_block_enabled` | **OFF** | Bloco de impacto no PDF cliente |
| `premium_soft_lock_enabled` | **ON** | Modal Premium, botão "Conhecer Premium" |
| `pdf_internal_compact_enabled` | **OFF** | PDF interno compacto (1 página) |
| `ui_split_enabled` | **OFF** | Layout split-screen desktop |
| `ui_wizard_enabled` | **OFF** | Wizard 3 passos |
| `ui_preview_anchor_enabled` | **OFF** | Reordenação preview (valor → prazo → investimento → CTA) |
| `ui_trust_badges_enabled` | **OFF** | Trust badges perto do CTA PDF |
| `ui_micro_interactions_enabled` | **OFF** | Microinterações (validação, transições, animações) |
| `ui_mobile_a11y_enabled` | **OFF** | Barra mobile + touch targets + foco/teclado |

---

## Paridade total (comportamento “clássico”)

Com todas as flags em default acima, a UI e o fluxo equivalem ao baseline pré-refactor.
