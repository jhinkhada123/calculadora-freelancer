# BASELINE v2

## Core behaviors esperados
- Modal de termos bloqueia ações protegidas até aceite.
- Modo Essencial é padrão na abertura.
- Modo Avançado é opt-in e possui fallback automático para Essencial em caso de validação inválida.
- Geração de PDF permanece funcional (incluindo caminho com flag `pdf_v2_enabled`).
- Compartilhamento, export/import e auditoria local permanecem funcionais.

## Parity guarantees
- Modo Essencial mantém contrato numérico com tolerância de `+-0.01` para saídas monetárias.
- Nenhuma alteração de rota pública obrigatória.

## Route guarantees
- `/` retorna 200 com `text/html`.
- `/calculadora.js` retorna 200 com `application/javascript`.
- `/compliance.js` retorna 200 com `application/javascript`.
- `/privacidade.html` retorna 200 com `text/html`.
- `/privacidade` retorna 200 com `text/html`.

## Feature flags e comportamento OFF
- `risk_score_enabled` (default: `true`)
  - OFF: card de auditoria oculto; restante do modo avançado permanece.
- `pdf_v2_enabled` (default: `true`)
  - OFF: estrutura de PDF volta para seção/títulos do fluxo anterior.

## Event names e intenção
- `calc_mode_toggle`: adoção do modo premium.
- `risk_score_view`: consumo da camada de auditoria.
- `pdf_generated`: uso de entregável consultivo.
- `scenario_saved`: uso de comparação estratégica.
- `integration_sent`: adoção de governança de dados.
