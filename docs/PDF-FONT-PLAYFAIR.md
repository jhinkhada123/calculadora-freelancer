# Playfair no PDF executivo

O jsPDF **não aceita TTF bruto**. É necessário usar o formato gerado pelo **font converter** oficial.

## Opção 1: Base64 direto (recomendado)

1. Baixe Playfair Display TTF: [Google Fonts](https://fonts.google.com/specimen/Playfair+Display)
2. Use o [jsPDF Font Converter](https://rawgit.com/nicklockwood/PDFFonts/master/build.html)
3. Faça upload do TTF e baixe o `.js` gerado
4. Extraia a string base64 do arquivo (variável `fontBase64` ou similar)
5. Em `index.html`, adicione em `deps`:
   ```javascript
   playfairFontBase64: "AAEAAAASAQA...", // base64 completo
   ```
6. Ou use `FEATURE_FLAGS.pdf_playfair_font_base64` se implementado

## Opção 2: URL que retorna base64

1. Converta o TTF conforme acima
2. Hospede o base64 em um endpoint que retorne `Content-Type: text/plain`
3. Em `FEATURE_FLAGS`:
   ```javascript
   pdf_playfair_font_url: "https://seu-cdn.com/playfair-base64.txt",
   ```

## Opção 3: URL de binário (experimental)

Algumas versões do jsPDF podem aceitar TTF. Teste com:
```javascript
pdf_playfair_font_url: "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay-Regular.ttf",
```
Se falhar, use Opção 1 ou 2.

## Validação

Gere um PDF com `pdf_executive_proposal_enabled = true` e verifique na telemetria:
- `fontMode: "premium"` → Playfair carregada
- `fontMode: "fallback"` → Helvetica (URL vazia ou conversão falhou)
