# Relatório QA — Release PDF Executivo

**Data:** 2026-03-06  
**Build/Commit:** 2d750b8  
**Ambiente:** preview/prod  
**Responsável:** ________________

---

## Instruções de execução (Gates 2–8)

Os Gates 2–8 exigem execução manual no navegador. Abra `index.html` (ou servidor local), altere as flags em `FEATURE_FLAGS` conforme cada gate e gere o PDF. Para telemetria: `localStorage.getItem("freela_telemetry_events_v1")` no Console (eventos em JSON).

---

## Gates 2–8

| Gate | Configuração | Passos executados | Evidência | Resultado |
|------|--------------|------------------|-----------|------------|
| **2** | `pdf_executive_proposal_enabled: false` | 1. Garantir proposalMode ativo. 2. Preencher dados. 3. Gerar PDF. | `proposta-freelancer.pdf` — layout legado (logo, responsável, escopo, investimento). | ☐ Pass / ☐ Fail |
| **3** | `pdf_executive_proposal_enabled: true`, `pdf_playfair_font_url: ""` | 1. proposalMode ativo. 2. Gerar PDF. | Ordem: Header → Ancoragem → Escopo → Precificação → Recomendação → Investimento → Rodapé. Rodapé "Proposta estruturada e validada por..." em todas as páginas. | ☐ Pass / ☐ Fail |
| **4** | `pdf_executive_proposal_enabled: true`, `pdf_internal_compact_enabled: true` | 1. Sair de proposalMode. 2. Selecionar "Formato interno: compact". 3. Voltar a proposalMode. 4. Gerar PDF. | PDF com 1 página; sem overflow; rodapé visível. | ☐ Pass / ☐ Fail |
| **5A** | `pdf_playfair_font_url: ""` | Gerar PDF executivo (Gate 3). | Telemetria: `pdf_generated.payload.fontMode === "fallback"`. | ☐ Pass / ☐ Fail |
| **5B** | `pdf_playfair_font_url: "<URL base64 válida>"` ou `pdf_playfair_font_base64: "<base64>"` | Gerar PDF executivo. | Telemetria: `pdf_generated.payload.fontMode === "premium"`. | ☐ Pass / ☐ Fail |
| **6** | Qualquer execução executiva | Gerar PDF executivo. | `pdf_generated`: mode, proposalMode, executiveBuilder=true, format, fontMode. Se fallback: `pdf_font_fallback_used` com reason. | ☐ Pass / ☐ Fail |
| **7A** | Desktop | Gerar PDF complete e compact. | Sem erro, sem travamento. | ☐ Pass / ☐ Fail |
| **7B** | Mobile (DevTools ou dispositivo) | Gerar PDF complete e compact. | Sem erro, sem travamento. | ☐ Pass / ☐ Fail |
| **8** | `pdf_executive_proposal_enabled: false` | Gerar PDF após desligar flag. | PDF legado igual ao Gate 2. | ☐ Pass / ☐ Fail |

---

## Checklist de payload (telemetria)

- [ ] `pdf_generated.payload.mode`
- [ ] `pdf_generated.payload.proposalMode`
- [ ] `pdf_generated.payload.executiveBuilder === true`
- [ ] `pdf_generated.payload.format` (complete | compact)
- [ ] `pdf_generated.payload.fontMode` (fallback | premium)
- [ ] `pdf_font_fallback_used.payload.reason` (quando fallback)

**Exemplo de payload esperado (Gate 6):**
```json
{
  "name": "pdf_generated",
  "payload": {
    "mode": "essential",
    "proposalMode": true,
    "pdfV2": true,
    "internalFormat": "complete",
    "executiveBuilder": true,
    "fontMode": "fallback",
    "format": "complete"
  }
}
```

---

## Resultado final

- **Gate 1** (já validado): PASS (13 suites / 94 tests)
- **Gates 2–8:** ____ / 9 aprovados
- **Decisão:** ☐ GO  ☐ GO com ressalva  ☐ NO-GO

---

## Critérios de decisão

| Resultado | Ação |
|-----------|------|
| Todos os gates aprovados | **GO** |
| Falha em 2, 3, 4, 6 ou 8 | **NO-GO** + rollback imediato |
| Falha apenas em 5B (premium), fallback ok | **GO com ressalva** |

---

## Se NO-GO (rollback)

1. `pdf_executive_proposal_enabled = false`
2. Deploy rápido
3. Validar PDF legado
4. Monitorar 15 min

---

## Observações

- Gates 2–8 requerem execução manual no navegador.
- __________________________________________
- __________________________________________
