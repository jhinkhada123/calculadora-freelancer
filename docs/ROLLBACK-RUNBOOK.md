# Rollback Runbook — 1 minuto

**Objetivo:** Reverter para comportamento estável em caso de incidente.

---

## Ordem de desligamento (prioridade)

Desligar **uma flag por vez** e validar. Se o problema persistir, passar para a próxima.

| # | Flag | Impacto ao desligar |
|---|------|---------------------|
| 1 | `ui_micro_interactions_enabled` | Remove validação visual, transições, animações |
| 2 | `ui_mobile_a11y_enabled` | Remove barra mobile, touch targets, focus/teclado |
| 3 | `ui_trust_badges_enabled` | Remove badges perto do CTA |
| 4 | `ui_preview_anchor_enabled` | Restaura ordem original do preview |
| 5 | `ui_wizard_enabled` | Remove wizard 3 passos, volta layout único |
| 6 | `ui_split_enabled` | Remove split-screen (se ativo) |

---

## Onde alterar

`index.html` → objeto `FEATURE_FLAGS` (linha ~1458):

```javascript
ui_micro_interactions_enabled: false,  // ← mudar para false
ui_mobile_a11y_enabled: false,
// ...
```

---

## Rollback total (paridade 100%)

Garantir que todas as flags de UI estejam em `false`:

- `ui_split_enabled: false`
- `ui_wizard_enabled: false`
- `ui_preview_anchor_enabled: false`
- `ui_trust_badges_enabled: false`
- `ui_micro_interactions_enabled: false`
- `ui_mobile_a11y_enabled: false`

---

## Pós-rollback

1. `npm test`
2. `node scripts/smoke-routes.mjs <URL_PRODUCAO>`
3. Teste manual rápido: termos, PDF, copiar, share
