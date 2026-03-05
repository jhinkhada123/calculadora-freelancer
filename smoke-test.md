# Smoke test (browser)

Subir um servidor estático na raiz do projeto (ex.: `npx serve .` ou `python -m http.server 8080`) e abrir `http://localhost:8080` (ou a porta usada).

## Checklist

1. **Console limpo**
   - Abrir DevTools → Console. Não deve haver `pageerror` nem `console.error` ao carregar a página.

2. **Dados padrão**
   - Com estado inicial (ou após "Resetar"), a seção "Resultado" deve mostrar taxa/hora, taxa/dia, horas faturáveis e faturamento alvo preenchidos (não "—").

3. **Aceite de termos**
   - Se o modal de termos aparecer, rolar até o fim e clicar "Aceitar e continuar". Os botões "Copiar taxa/hora", "Gerar Proposta em PDF", etc. devem ser habilitados (quando o cálculo for válido).

4. **Geração de PDF**
   - Clicar em "Gerar Proposta em PDF" (ou "Gerar Proposta em PDF" no painel da proposta, se estiver em Modo Proposta). Deve baixar um PDF sem exceção no console.

5. **Cenários extremos**
   - **Percentual >= 100%:** Ajustar Impostos + Margem + Buffer para soma ≥ 100. Resultado deve mostrar mensagem de erro e valores "—"; botão PDF desabilitado.
   - **Utilização mínima:** Colocar "Taxa de horas faturáveis" em 10%. Resultado deve calcular ou mostrar erro de horas faturáveis, sem exceção.
   - **Horas do projeto zero:** Com "Horas do projeto" em 0, valor do projeto e PDF de proposta devem refletir "Preencha as horas" / botão desabilitado, sem exceção.

## Playwright (opcional)

Para automação, instalar Playwright e criar um spec que:
- Navega para a URL do app.
- Verifica ausência de `pageerror` e `console.error`.
- Preenche entradas padrão, aceita termos (se o modal estiver visível), e verifica que taxa/hora e valor do projeto são exibidos.
- Clica em "Gerar Proposta em PDF" e verifica que não há exceção.
