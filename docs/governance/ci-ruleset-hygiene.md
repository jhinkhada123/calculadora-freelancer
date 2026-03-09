# CI/Ruleset Hygiene

Operational policy for merge gates and deployment checks.

## Required checks (main)

The ruleset `protecao-main-governanca` requires only:

| Check | Purpose |
|-------|---------|
| `risk-classification` | Auto-classify PR risk from changed paths |
| `governance-evidence` | Validate mandatory evidence for risk:high |
| `governance-domain` | Golden dataset + monotonicity tests (risk:high only) |

**No other checks are required.** Deployment statuses are informational unless explicitly added to the ruleset.

## Deployment checks (informational)

| Check | Status | Action |
|-------|--------|--------|
| `Vercel – calculadora-freelancer-orpin` | Active target | Informational; optional to require |
| `Vercel – calculadora-freelancer` | Legacy | Disconnect from GitHub to avoid noise |

**Legacy project hygiene:** Disconnect the old Vercel project `calculadora-freelancer` from the GitHub repo (Vercel dashboard → Project Settings → Git) so it stops posting PR status. Only `calculadora-freelancer-orpin` should post deployment status.

## Docs-only PRs

- Docs-only PRs are evaluated by governance checks only.
- Deployment status is informational unless explicitly required in the ruleset.
- No product-code change → no deployment gate required.

## Validation

```bash
gh pr checks <PR>
gh pr view <PR> --json mergeStateStatus,mergeable,statusCheckRollup
```

Required gates: `risk-classification`, `governance-evidence`, `governance-domain`. No gate depends on legacy Vercel checks.
