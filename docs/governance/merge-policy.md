# Merge Policy (Governance)

This policy is blocking for pull requests.

## 1) Risk classification
- Risk is auto-classified by path diff in CI.
- Labels are managed automatically: `risk:low`, `risk:medium`, `risk:high`.
- CI summary must always publish the origin (which files/rules triggered the risk).

## 2) Merge gates by risk
- `risk:low`
  - Standard tests/checks only.
- `risk:medium`
  - Standard tests/checks + PR evidence sections recommended.
- `risk:high`
  - Blocking gates (all required):
    - risk origin in CI summary
    - mandatory PR evidence sections
    - golden dataset tests
    - monotonicity tests
    - rollback + migration plan
    - post-merge observability plan
    - CODEOWNER review on sensitive files

If any required gate fails for `risk:high`, merge is invalid.

## 3) Evidence is mandatory for `risk:high`
Required sections in PR body:
1. `Risk Classification`
2. `Evidence`
3. `Rollback + Migration`
4. `Golden Dataset`
5. `Monotonicity`
6. `Post-merge Observability`

`governance:override` label requires `Override Justification` section.

## 4) Overrides are explicit and rare
- Override requires:
  - label `governance:override`
  - explicit justification in PR body
  - extra CODEOWNER approval
  - governance changelog note
- Target metric: override rate <= 5% per month for `risk:high` PRs.

## 5) Branch protection (required)
After this policy is merged, protect `main` with:
- Require pull request before merging
- Require approvals
- Require CODEOWNER review
- Require status checks:
  - `risk-classification`
  - `governance-evidence`
  - `governance-domain`

No direct push to protected branch.

<!-- validation low-risk marker -->
