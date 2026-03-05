# Eventos de Produto

## calc_mode_toggle
- **Disparo**: quando usuário alterna `Modo Essencial | Modo Avançado`.
- **Payload mínimo**: `{ advancedMode: boolean }`
- **Objetivo**: entender adoção do modo premium.

## risk_score_view
- **Disparo**: quando score de risco é renderizado no modo avançado.
- **Payload mínimo**: `{ score: number, model: string }`
- **Objetivo**: medir consumo da camada de auditoria.

## pdf_generated
- **Disparo**: após gerar PDF com sucesso.
- **Payload mínimo**: `{ mode: "essential|advanced", proposalMode: boolean, pdfV2: boolean }`
- **Objetivo**: acompanhar valor percebido do entregável.

## scenario_saved
- **Disparo**: ao salvar cenário A ou B.
- **Payload mínimo**: `{ slot: "A|B", mode: string }`
- **Objetivo**: medir uso de comparação estratégica.

## integration_sent
- **Disparo**: envio com sucesso para endpoint externo.
- **Payload mínimo**: `{ kind: "sheets|notion", mode: string }`
- **Objetivo**: acompanhar adoção de governança de dados.
