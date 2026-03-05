# Changelog

## v2.1.0 - 2026-03-05
- Adiciona motor de negociação com justificativas prontas (resumo executivo, técnica e prioridade/risco), com linguagem de estimativa robusta em pt-BR.
- Inclui ancoragem de ROI para impacto crítico, Scope Shielding (score + markup controlado), prêmio dinâmico de conveniência e simulador de runway.
- Atualiza PDF para incluir justificativas selecionadas, ancoragem de ROI, notas de escopo/escassez e resumo de reserva.
- Preserva fluxos essenciais (termos, cálculo base, compliance/auditoria, share/export/import) sem alteração do contrato numérico do modo Essencial.
- Expande cobertura de testes para 41 casos totais e mantém smoke de rotas obrigatórias em estado GO-LIVE READY.

## v2.0.0-stable - 2026-03-05
- Congelamento da baseline elite-v2 no commit `993ec18`.
- Validação de produção das 5 rotas obrigatórias com content-type correto.
- Suite de testes unitários verde (35/35).
- Documentação de release/baseline adicionada para próximo sprint.
