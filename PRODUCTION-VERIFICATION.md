# Hard production verification — factual results

## 1) URL checks (real requests)

No production URL for this pricing app is stored in the repo. The following requests were made to guess common Vercel deployments:

| URL | Status | Content-Type | First 80 chars of response |
|-----|--------|--------------|----------------------------|
| `https://meuprimeiroapp.vercel.app/` | 200 | (not recorded) | `Hello, World!` — **not the calculator app** (different project). |
| `https://meuprimeiroapp.vercel.app/calculadora.js` | **404** | — | — |
| `https://meuprimeiroapp.vercel.app/compliance.js` | (not requested; 404 expected) | — | — |
| `https://calculadora-freelancer.vercel.app/` | **404** | — | — |
| `https://calculadora-freelancer.vercel.app/calculadora.js` | **404** | — | — |

**Conclusion:** No deployed instance of this pricing app was reachable at the URLs tried. To get factual production results, provide the real deployed base URL (e.g. `https://your-app.vercel.app`) and run the same checks there.

---

## 2) Hosting config — ensure JS is 200 + JavaScript MIME

**Current `vercel.json`** (unchanged): explicit rewrites for `/calculadora.js`, `/compliance.js`, `/privacidade.html` are listed **first**. In Vercel the first matching rewrite wins, so a later SPA fallback (e.g. `"source": "/(.*)"`, `"destination": "/index.html"`) would **not** apply to these paths.

**Rule:** Do **not** add a catch‑all rewrite that matches paths with a file extension. If you add an SPA fallback, use a source that excludes such paths (e.g. negative lookahead so that `*.js`, `*.html`, `*.css`, `*.png` are not matched). Then static assets continue to be served as files (200 + correct MIME).

Privacy rewrites for `/privacidade` and `/privacidade/` are kept so that route works.

---

## 3) Browser re-test (PASS/FAIL with evidence)

**Cannot run browser tests** without a production (or staging) URL. Run the following yourself at your deployed base URL and fill the table.

| Check | How to verify | PASS | FAIL | Evidence (one line) |
|-------|----------------|------|------|---------------------|
| Inputs recalculate values | Change renda/custos/%; see taxa/hora and faturamento update | ☐ | ☐ | e.g. "Changed targetIncome → hourly rate updated" |
| Proposal mode toggles and updates cards | Toggle "Modo Proposta"; proposal card and PDF button show/hide | ☐ | ☐ | e.g. "Toggle shows resultCardProposal" |
| Copy buttons work | Click copy taxa/hora, projeto, texto, link; toast + clipboard | ☐ | ☐ | e.g. "Toast 'Taxa/hora copiada'" |
| Both PDF buttons work | Click main PDF and proposal-panel PDF; PDF downloads | ☐ | ☐ | e.g. "Both buttons download PDF" |
| Terms modal accept flow | Open modal, scroll to end, Accept; modal closes, buttons enable | ☐ | ☐ | e.g. "Accept closes modal and enables copy" |
| Privacy link opens | Click "Política de Privacidade"; privacidade page loads | ☐ | ☐ | e.g. "privacidade.html loads" |

**Evidence** = one short factual line (what you did + what you saw).

---

## 4) Deliverables

### Exact root cause (confirmed from earlier incident)

**When the app “loads UI but calculations and buttons are dead”:** the first failure is **module script load failure** — the browser does not successfully load `calculadora.js` or `compliance.js` (404 or response with non-JS MIME, e.g. HTML from SPA fallback). With static imports, the entire app script then never runs, so no `compute`, no `wireEvents`, no `updateUI`; only the static HTML is visible.

No production URL was available to confirm this on a live deployment; the cause is inferred from behavior and from the 404s seen on the guessed URLs.

### Exact `vercel.json` final content

```json
{
  "rewrites": [
    { "source": "/calculadora.js", "destination": "/calculadora.js" },
    { "source": "/compliance.js", "destination": "/compliance.js" },
    { "source": "/privacidade.html", "destination": "/privacidade.html" },
    { "source": "/privacidade", "destination": "/privacidade/index.html" },
    { "source": "/privacidade/", "destination": "/privacidade/index.html" }
  ]
}
```

### Changed files (this verification pass)

- **None.** No code or config was changed. `vercel.json` was already in the correct state; no production URL was available to run real HTTP or browser tests.

### PASS/FAIL table (real observed results)

| Item | Result | Note |
|------|--------|------|
| `/` at meuprimeiroapp.vercel.app | **200** | Returns "Hello, World!" — not this app. |
| `/calculadora.js` at meuprimeiroapp.vercel.app | **404** | Not the calculator deploy. |
| `/calculadora.js` at calculadora-freelancer.vercel.app | **404** | Project or path not found. |
| Hosting config (vercel.json) | **PASS** | Explicit rewrites for .js and .html; no SPA fallback in repo. |
| Browser re-test (all 6 checks) | **Not run** | No production URL provided; use table in §3 at your deployed URL. |

To complete verification: deploy this repo, note the live URL, then run the URL checks from §1 and the browser checklist from §3 at that URL and fill in the evidence.
