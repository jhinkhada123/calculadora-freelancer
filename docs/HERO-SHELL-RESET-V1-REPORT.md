# Hero Shell Reset v1 — Relatório de Recuperação

## 1) Lista de arquivos alterados

| Arquivo | Status |
|---------|--------|
| `docs/HERO-SHELL-RESET-V1-ACCEPTANCE.md` | Novo |
| `docs/hero-shell-BEFORE-desktop.png` | Novo |
| `docs/hero-shell-BEFORE-mobile.png` | Novo |
| `docs/hero-shell-AFTER-desktop.png` | Novo |
| `docs/hero-shell-AFTER-mobile.png` | Novo |

**Nota:** A branch `codex/hero-shell-reset-v1-clean` é idêntica a `origin/main` (sem diff). O `main` já contém o Hero HUD correto via PR #18. Este relatório documenta o mapeamento canônico e os artefatos de aceite.

---

## 2) Mapeamento exato hero/floor/sustainable/ideal

| HUD | Fonte | Localização em `app.js` |
|-----|-------|-------------------------|
| **hero** | `r.hourly` | `safeMoney(els.pricingHudHeroValue, ...)` linhas ~1282, ~2784–2786 |
| **floor** | `pricingBand.piso` | `safeMoney(els.pricingHudFloorValue, ...)` linha ~1085 |
| **sustainable** | `pricingBand.sustentavel` | `safeMoney(els.pricingHudSustainableValue, ...)` linha ~1086 |
| **ideal** | `pricingBand.ideal` | `safeMoney(els.pricingHudIdealValue, ...)` linha ~1087 |
| **risk** | `computeRiskScore` + `riskNarrative` | `renderRiskAudit` linhas ~2657–2672 |

**Proibido:** `revenueTarget` em sustainable, placeholders em floor/ideal.

---

## 3) Caminhos dos 4 screenshots

- `docs/hero-shell-BEFORE-desktop.png` — viewport 1280×720, commit `95c096e`
- `docs/hero-shell-BEFORE-mobile.png` — viewport 375×667, commit `95c096e`
- `docs/hero-shell-AFTER-desktop.png` — viewport 1280×720, branch `codex/hero-shell-reset-v1-clean`
- `docs/hero-shell-AFTER-mobile.png` — viewport 375×667, branch `codex/hero-shell-reset-v1-clean`

---

## 4) Outputs dos comandos

### `npm test -- --runInBand`
```
Test Suites: 33 passed, 33 total
Tests:       217 passed, 217 total
Time:        ~3.8 s
```

### `npm run check`
```
Exit code: 0
```

### `node --check app.js`
```
Exit code: 0
```

### `npm run smoke:routes -- https://calculadora-freelancer-orpin.vercel.app`
```
Final verdict: GO-LIVE READY
```

---

## 5) Validação

- [x] Branch limpa (sem arquivos não relacionados)
- [x] Mapeamento canônico HUD
- [x] 4 screenshots before/after
- [x] `npm test -- --runInBand` OK
- [x] `npm run check` OK
- [x] `node --check app.js` OK
- [x] Smoke na URL de preview OK

**Merge:** Bloqueado até confirmação dos artefatos. Todos os artefatos estão presentes.
