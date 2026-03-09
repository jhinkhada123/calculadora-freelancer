# Design Polish v2 — Acceptance Artifacts

## Process Rule
**Screenshot captures are invalid if any blocking modal or onboarding overlay is visible.**

## Scope
- First-viewport hierarchy polish (hero → band → risk → CTA)
- Section weight reduction (support/telemetry demoted)
- Rhythm/spacing polish
- CTA clarity (one dominant primary action)

## Changed Files
- `index.html` — operation panel labels, result card, pricingEngineV1Card, header spacing, rhythm
- `src/input.css` — pricing-hud (hero dominance, band secondary, risk compact), mode-card, hero-signal, hero-trust-line
- `dist/styles.css` — built from src/input.css

## app.js Touched?
**No.** No changes to app.js.

## Screenshots (same sample data: Renda 15000, Custos 2000)
- `docs/design-polish-v2/before-desktop-1280x720.png`
- `docs/design-polish-v2/before-mobile-375x667.png`
- `docs/design-polish-v2/after-desktop-1280x720.png`
- `docs/design-polish-v2/after-mobile-375x667.png`

## Validation
- npm test -- --runInBand: 33 suites, 217 tests passed
- npm run check: OK
- node --check app.js: OK (not touched)
- smoke on https://calculadora-freelancer-orpin.vercel.app: GO-LIVE READY

## Explicit Statement
**No pricing/domain semantic changes.** All edits are presentation-only (CSS, HTML structure, visual weight). No engine, domain, or state-model changes.
