# Production incident sweep — pricing app

## 1) Root cause (first fatal error)

**Identified first failure:**  
When the UI loads but calculations and buttons are dead, the **earliest possible failure** is **module script load failure**: the browser fails to load `calculadora.js` or `compliance.js` (or both) because of:

- **404** — files not deployed or wrong path
- **Wrong MIME type** — server returns `text/html` (e.g. `index.html`) for `*.js` when a **SPA fallback rewrite** sends all requests to `index.html`
- **CORS / network** — blocked or failed fetch for the module URL

With **static top-level `import`**, any failure in loading a module **stops the entire script**. The parser never runs the rest of the module, so:

- No `compute`, no `hasAcceptedTerms`, etc.
- No `wireEvents()` → no listeners
- No `updateUI()` → results stay "—"
- But the **static HTML** is already in the DOM, so the "UI loads" (labels, inputs, buttons) while **all behavior is dead**.

**How to confirm in the browser:**

| Check | Where | What to see |
|-------|--------|-------------|
| First Console error | DevTools → Console | e.g. `Failed to load module script: The server responded with a non-JavaScript MIME type` or `404 (Not Found)` for `calculadora.js` or `compliance.js` |
| Network | DevTools → Network → filter by JS | `calculadora.js`, `compliance.js`: **Status 200**, **Type** `application/javascript` or `text/javascript`. If Status 200 but Type `text/html`, the server is returning HTML (SPA rewrite). |
| jspdf CDN | Network | `jspdf.umd.min.js`: 200 from cdnjs. Optional; PDF fails later if missing. |

**Root cause (single):**  
**Module script(s) not loaded** — either 404 or wrong MIME (HTML instead of JS), so the app script never runs and all behavior (calculations, buttons) is dead.

---

## 2) Deployment / static serving

**Done:**

- **vercel.json**  
  - Rewrites added so that **before** any future SPA fallback, requests for `/calculadora.js`, `/compliance.js`, and `/privacidade.html` are explicitly routed to the same path (static files).
  - Existing `/privacidade` and `/privacidade/` rewrites kept for compatibility.

**Deploy checklist:**

- Ship in the **same directory** as the requested `index.html`: `index.html`, `calculadora.js`, `compliance.js`, `privacidade.html`.
- If the app is served at a **subpath** (e.g. `https://site.com/app/`), either:
  - Deploy these four files under that subpath, and ensure **no** rewrite sends `/app/calculadora.js` or `/app/compliance.js` to HTML, or
  - Adjust `vercel.json` rewrites to include the subpath (e.g. `/app/calculadora.js` → `/app/calculadora.js`).
- Ensure the server sends `.js` with MIME `application/javascript` (or `text/javascript`). If using a catch‑all SPA rewrite, **exclude** `*.js` and `privacidade.html` so static assets are served as files.

---

## 3) Boot process (fault-tolerant)

**Changes:**

- **Static imports removed.** No more top-level `import ... from "./calculadora.js"` or `"./compliance.js"`.
- **Guarded bootstrap with dynamic import:**
  - `(async function bootstrap() { ... })()` runs on load.
  - First `await import("./calculadora.js")`; on failure → `showBootError(e, "Falha ao carregar calculadora.js")` and return (no further run).
  - Then `await import("./compliance.js")`; on failure → `showBootError(e, "Falha ao carregar compliance.js")` and return.
  - Only after **both** succeed are `compute`, `hasAcceptedTerms`, etc. assigned and `init()` (wireEvents, setupTermsModal, updateUI) run.
- **Visible fatal banner:**  
  `showBootError(err, context)` shows a red in-page banner with:
  - Context (e.g. which module failed or "Erro na inicialização"),
  - Error message,
  - Short hint: "Verifique: calculadora.js e compliance.js (HTTP 200, MIME application/javascript). Rede/Console para detalhes.",
  - And `console.error(context, err)` for stack/details.
- **Init errors:**  
  `init()` is wrapped in try/catch; on throw, `showBootError(bootErr, "Erro na inicialização")` is called.
- **Promise rejection:**  
  `bootstrap()` is invoked with `.catch((e) => showBootError(e, "Bootstrap"))` so any unhandled rejection in the async bootstrap is shown in the banner.
- **DOM safety (unchanged from previous sweep):**  
  Null-checks before attaching listeners and before reading/writing `els.*`; one missing node does not crash startup.

---

## 4) Functional recovery checks (must pass)

| Check | Expected |
|-------|----------|
| Changing inputs updates results | Editing renda, custos, percentuais, etc. updates taxa/hora, taxa/dia, faturamento alvo (and proposal block when in proposal mode). |
| Proposal mode toggle | Checkbox "Modo Proposta" shows/hides the right panels and proposal PDF button. |
| Copy buttons | "Copiar taxa/hora", "Copiar valor do projeto", "Copiar texto", "Copiar link" work when terms accepted and data valid (toast + clipboard). |
| PDF buttons | Both "Gerar Proposta em PDF" (main and proposal panel) generate PDF when terms accepted and inputs valid; no uncaught exception. |
| Terms modal | Modal opens when terms not accepted; scroll-to-end enables "Aceitar e continuar"; acceptance closes modal and enables copy/PDF/share. |
| Privacy link | Footer "Política de Privacidade" opens `/privacidade.html` (or `privacidade.html` relative); page loads without breaking module paths. |

---

## 5) Deliverables summary

### Exact root cause

**First runtime failure:** module script(s) (`calculadora.js` and/or `compliance.js`) fail to load (404 or non-JS MIME, often due to SPA rewrite). With static imports, the whole app script never runs → UI visible but calculations and buttons dead.

### Files changed

| File | Change |
|------|--------|
| **index.html** | Replaced static `import` of `calculadora.js` and `compliance.js` with guarded bootstrap: `showBootError(err, context)` at top; `(async function bootstrap() { ... })()`. Dynamic `import("./calculadora.js")` then `import("./compliance.js")`; on success assign `compute`, `hasAcceptedTerms`, etc. and run existing init (wireEvents, setupTermsModal, updateUI). Init in try/catch; bootstrap rejection handled with `.catch(showBootError)`. Banner text made actionable (check HTTP 200, MIME, Rede/Console). Removed duplicate `showBootError` that was below `els`. |
| **vercel.json** | Added rewrites so `/calculadora.js`, `/compliance.js`, `/privacidade.html` are explicitly routed to the same path (static files) before any SPA fallback. Kept `/privacidade` and `/privacidade/` rewrites. |
| **INCIDENT-REPORT.md** | This report (root cause, deployment, boot hardening, recovery checks). |

### Hosting config changes

- **vercel.json** — New rewrites for `/calculadora.js`, `/compliance.js`, `/privacidade.html` so they are served as static files and not rewritten to HTML. If the app is later deployed under a subpath, add matching rules (e.g. `/app/calculadora.js` → `/app/calculadora.js`) or ensure no catch-all rewrite applies to these URLs.

### Before / after behavior

| Scenario | Before | After |
|----------|--------|--------|
| Module 404 or wrong MIME | Blank or static UI; no banner; only console/network show the error. | Red banner: "Falha ao carregar calculadora.js" (or compliance.js) + message + hint to check HTTP 200 and MIME; console.error with stack. |
| Module loads, init throws (e.g. missing DOM) | Uncaught exception; possibly blank or half-drawn UI. | Banner: "Erro na inicialização" + message; console.error. |
| All loads OK | App works as before. | Same behavior; bootstrap adds one short async step before init. |

### Pass/fail checklist (recovery checks)

| # | Check | Pass/fail (to verify in browser) |
|---|--------|-----------------------------------|
| 1 | Input changes update hourly/daily/revenue | ☐ PASS / ☐ FAIL |
| 2 | Proposal mode toggle works | ☐ PASS / ☐ FAIL |
| 3 | Copy buttons work (hourly, project, text, link) | ☐ PASS / ☐ FAIL |
| 4 | Both PDF buttons work | ☐ PASS / ☐ FAIL |
| 5 | Terms modal opens and acceptance flow works | ☐ PASS / ☐ FAIL |
| 6 | Privacy link works and modules still load | ☐ PASS / ☐ FAIL |

Run the above in a production-like environment (same host/routing as prod) after deploying the changed files and vercel.json.
