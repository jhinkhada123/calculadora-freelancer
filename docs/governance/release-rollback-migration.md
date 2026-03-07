# Release, Rollback and Migration

## Rule: rollback and migration are inseparable
For any `risk:high` PR touching motor/contract/schema:
- rollback plan is mandatory
- migration status is mandatory
- legacy-state migration test evidence is mandatory

## Migration status values
Every `risk:high` PR must declare one:
- `reversible`
- `irreversible`
- `backward-compatible`

If migration is irreversible, PR must document blast radius and mitigation.

## Release checklist (`risk:high`)
1. Release tag prepared
2. Rollback command documented
3. Migration status declared
4. Legacy state test executed
5. Golden dataset passing
6. Monotonicity passing
7. Owner on-watch assigned

## Post-merge observability
Observation window: 30-60 minutes after merge/deploy.

Minimum signals:
- boot/runtime error signal
- smoke on critical pricing route
- JS/API failure rate above threshold

Decision outcomes:
- normal
- hotfix
- rollback

## Incident taxonomy (for attribution)
Counts as post-merge incident for `risk:high` if within attribution window:
- rollback
- hotfix
- smoke failure
- relevant boot error
- critical pricing screen functional break
- performance degradation above threshold

Attribution window should be declared in PR (`24h` or `72h`) and owner must be explicit.

## Breach policy
- `governance_breach_count` target is zero.
- Any breach requires RCA.
- Two close breaches require governance policy review.
