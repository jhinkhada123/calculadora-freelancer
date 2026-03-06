# Release v2.2 — Refactor UI/UX completo

**Data:** 2025-03-02

---

## Tag de release

```bash
git add -A
git commit -m "refactor: Fases 1-6 UI/UX com flags (split, wizard, preview, trust, micro, mobile a11y)"
git tag -a v2.2.0 -m "Baseline refactor UI/UX - flags OFF por padrão"
git push origin main --tags
```

---

## Smoke pós-deploy

Logo após o deploy final em produção:

```bash
node scripts/smoke-routes.mjs https://calculadora-freelancer-orpin.vercel.app
```

**Esperado:** `Final verdict: GO-LIVE READY`

---

## Referências

- [FEATURE-FLAGS.md](./FEATURE-FLAGS.md) — Estado padrão das flags
- [ROLLBACK-RUNBOOK.md](./ROLLBACK-RUNBOOK.md) — Rollback em 1 minuto
