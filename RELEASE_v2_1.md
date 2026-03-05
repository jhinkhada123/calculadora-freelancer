# RELEASE v2.1 - Negotiation Power

## Objetivo
- Adicionar capacidades de negociação comercial sobre a base estável `v2.0.0-stable` sem quebrar comportamento existente.

## Entregas principais
- Value Justification Engine com blocos copy-ready em pt-BR.
- ROI Anchoring para cenários com impacto crítico (UI e PDF) + caveat obrigatório.
- Scope Shielding com checklist de risco do cliente, score ponderado e Taxa de Gestão de Expectativa com teto.
- Dynamic Scarcity Markup por curva progressiva de ocupação da agenda.
- Stress/Runway Simulator com premissas explícitas.
- PDF v2.1 com justificativas, ancoragem, notas de escopo/escassez e resumo de runway.

## Segurança e compatibilidade
- Sem segredos/tokens no frontend.
- Fluxos legados preservados: termos, cálculo base, PDF, share/export/import, compliance e auditoria.
- Integridade de rotas públicas obrigatórias mantida.
- Paridade do modo Essencial preservada no contrato de regressão (`+-0.01`).

## Testes executados
- Suites: 6
- Testes: 41
- Status: todos verdes

## Smoke de produção
- `/` -> 200 `text/html`
- `/calculadora.js` -> 200 `application/javascript`
- `/compliance.js` -> 200 `application/javascript`
- `/privacidade.html` -> 200 `text/html`
- `/privacidade` -> 200 `text/html`
