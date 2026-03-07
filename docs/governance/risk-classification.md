# Risk Classification

## Automatic classification source
Classification is based on changed paths in the pull request diff.

## Path rules
### High risk (`risk:high`)
- `calculadora.js`
- `proposal-metrics.js`
- `advanced-pricing.js`
- `strategist-mode.js`
- `negotiation-v21.js`
- `proposal-tiers.js`
- `utils/sanitize-state.js`
- `utils/storage.js`

### Medium risk (`risk:medium`)
- `app.js`
- `index.html`
- `feature-flags.js`
- `ui-mode-constants.js`
- `pdf-*.js`

### Low risk (`risk:low`)
- Any diff that does not match high/medium rules.

## Summary requirement
When `risk:high` is applied, CI must publish in summary:
- risk level
- risk label
- origin list (`file + rule`)

If origin is missing, evidence gate fails.

## Governance metrics
Formulas used to monitor governance health:
- `override_rate = (risk:high PRs with override) / (total risk:high PRs in month)`
- `flaky_rate = (non-reproducible check failures) / (total check executions)`
- `ci_duration_p95_required = p95 duration of required merge checks`
- `governance_breach_count = merges violating governance policy`
- `post_merge_incident_rate_risk_high = (risk:high PRs with incident in attribution window) / (total risk:high PRs)`

Targets:
- `override_rate <= 5%`
- `flaky_rate <= 2%`
- `governance_breach_count = 0`
