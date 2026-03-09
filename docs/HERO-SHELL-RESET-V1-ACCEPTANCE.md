# Hero Shell Reset v1 - Acceptance Artifacts

## Mapeamento canônico do HUD (obrigatório)

| HUD | Fonte | Proibido |
|-----|-------|----------|
| hero | `r.hourly` | — |
| floor | `pricingBand.piso` | Placeholder ou remap |
| sustainable | `pricingBand.sustentavel` | `revenueTarget` |
| ideal | `pricingBand.ideal` | Placeholder ou remap |
| risk | `computeRiskScore` + `riskNarrative` | — |

**Implementação em `app.js`:**
- `pricingHudHeroValue` ← `r.hourly` (linhas ~1282, ~2784–2786)
- `pricingHudFloorValue` ← `pricingBand.piso` (linha ~1085)
- `pricingHudSustainableValue` ← `pricingBand.sustentavel` (linha ~1086)
- `pricingHudIdealValue` ← `pricingBand.ideal` (linha ~1087)
- `pricingHudRiskDot` / `pricingHudRiskLabel` ← `renderRiskAudit` (linhas ~2657–2672)

---

## Estado de amostra obrigatório (mesmo para before e after)

- Renda: 15000
- Custos: 2000
- Impostos: 15%
- Margem: 20%
- Buffer: 10%
- Utilização: 70%
- Horas/dia: 8
- Dias/semana: 5
- Férias: 4
- Horas do projeto: 40

---

## Screenshots (before/after)

**Artefatos esperados:**
- `docs/hero-shell-BEFORE-desktop.png` — viewport 1280×720, commit `95c096e` (main antes do PR #18)
- `docs/hero-shell-BEFORE-mobile.png` — viewport 375×667, mesmo commit
- `docs/hero-shell-AFTER-desktop.png` — viewport 1280×720, branch `codex/hero-shell-reset-v1-clean`
- `docs/hero-shell-AFTER-mobile.png` — viewport 375×667, mesma branch

**Como capturar:**
1. **Before (desktop):** `git checkout 95c096e` → `npx serve` → preencher com estado acima → capturar primeiro viewport (1280×720).
2. **Before (mobile):** Mesmo estado, viewport 375×667.
3. **After (desktop):** `git checkout codex/hero-shell-reset-v1-clean` → servir app → mesmo estado → capturar.
4. **After (mobile):** Mesmo estado, viewport mobile.

**Merge bloqueado** até confirmação dos 4 screenshots.

---

## Validações obrigatórias

```bash
npm test -- --runInBand
npm run check
node --check app.js
npm run smoke:routes -- <URL_PREVIEW>
```

---

*Documento de aceite para Hero Shell Reset v1. No merge before screenshot proof.*
