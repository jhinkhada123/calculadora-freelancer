# RELEASE v2 - Elite Baseline

## Release commit
- `993ec18` (baseline candidato congelado)

## Feature summary
- Camada premium/avançada com explicabilidade e fallback seguro para modo essencial.
- Modo Auditoria com score de risco (0-100), narrativa e badge de exaustão.
- Visual "Midnight Luxe" com refinos de hierarquia premium sem redesenho estrutural.
- Governança de Dados (envio via endpoint do usuário, sem credenciais no frontend).
- Instrumentação local/pluggable para eventos de produto.

## Integridade em produção (rotas obrigatórias)
- `/` -> 200 `text/html`
- `/calculadora.js` -> 200 `application/javascript`
- `/compliance.js` -> 200 `application/javascript`
- `/privacidade.html` -> 200 `text/html`
- `/privacidade` -> 200 `text/html`

## Known limitations
- Verificação automática de console inicial em ambiente headless pode variar por plataforma; validar manualmente no navegador alvo.
- Monte Carlo depende de histórico válido (>=20 amostras); abaixo disso permanece no modo determinístico por faixa.

## Rollback steps
1. Identificar commit estável anterior no histórico (`git log --oneline`).
2. Reverter para o commit desejado:
   - `git checkout <commit>`
   - ou `git revert <sha_problematico>` (preferível em branch compartilhada).
3. Publicar:
   - `git push origin main`
4. Confirmar rotas com smoke:
   - `node scripts/smoke-routes.mjs https://calculadora-freelancer-orpin.vercel.app`

## Release tag
- `v2.0.0-stable`
