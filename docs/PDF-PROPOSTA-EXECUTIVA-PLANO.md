# Plano de Refatoração: PDF → Proposta Executiva de Alto Valor

**Projeto:** Calculadora de Precificação para Freelancers  
**Caminho:** `C:\Users\emano\OneDrive\Desktop\meuprimeiroapp`  
**Data:** 2026-03-06  
**Última atualização:** 2026-03-06  
**Status:** Arquitetura e estratégia — decisões fechadas, pronto para codar

---

## 1. Diagnóstico do estado atual (gaps e riscos)

### 1.1 Gaps identificados

| Gap | Descrição | Impacto |
|-----|-----------|---------|
| **Paradigma orçamentário** | Preço aparece cedo; estrutura lembra recibo/orçamento | Abre espaço para pechincha; reduz percepção de valor |
| **Hierarquia invertida** | Investimento/preço antes de valor ganho e escopo | Cliente foca no custo antes de entender benefício |
| **Estética fiscal** | Helvetica, layout denso, poucos blocos visuais | Parece documento interno, não proposta comercial |
| **Paginação ingênua** | `ensureSpace` genérico; blocos podem ser cortados | Quebra de seções no meio da página |
| **Monolito** | `generatePdf` única com ~400 linhas; lógica misturada | Difícil evoluir; sem reuso de blocos |
| **Sem design system** | Cores, fontes e espaçamentos hardcoded | Inconsistência; difícil manter coerência com UI |
| **Logo sem fallback** | Se logo falhar, layout pode quebrar | Risco de PDF feio ou erro em edge cases |
| **Sem plug para Cenário A/B** | Estrutura não prevê comparação de cenários | Refatoração futura mais cara |

### 1.2 Riscos atuais

- **Regressão:** Qualquer alteração pode quebrar PDF Completo ou Compacto.
- **Compatibilidade:** Dados atuais (state, proposalMode, strategist) devem continuar funcionando.
- **Dependência jsPDF:** Sem fallback se CDN falhar; fontes customizadas (Playfair) exigem carregamento explícito.
- **UTF-8:** Uso de `\u00E1` em alguns pontos; garantir que acentuação não corrompa.

---

## 2. Arquitetura alvo do gerador de PDF

### 2.1 Módulos / funções (alto nível)

| Módulo | Responsabilidade | Contrato entrada | Contrato saída |
|--------|------------------|------------------|----------------|
| **pdfContext** | Monta payload unificado (state, compute, negotiation, strategist) | `getStateFromInputs()`, `buildPricingContext()`, `buildNegotiationContext()` | Objeto `PdfContext` com todos os dados necessários |
| **pdfDesignSystem** | Tokens visuais (cores, fontes, espaçamentos, tamanhos) | — | Objeto `PdfDesignTokens` |
| **pdfLayoutEngine** | Paginação, `keepTogether`, `ensureSpace` inteligente | `doc`, `y`, `block`, `pageHeight`, `margin` | `{ y, addPage, blockFits }` |
| **pdfBlockRenderer** | Renderiza um bloco (cabeçalho, valor ganho, escopo, investimento, rodapé) | `doc`, `context`, `design`, `layout` | `{ heightUsed, success }` |
| **pdfProposalBuilder** | Orquestra ordem dos blocos e chama renderers | `doc`, `context`, `format` (complete/compact) | `doc` preenchido |
| **generatePdf** | Ponto de entrada; carrega jsPDF, valida termos, chama builder | Estado da UI, `proposalMode`, `pdfInternalFormat` | PDF salvo ou erro |

### 2.2 Fluxo de dados

```
getStateFromInputs() → buildPricingContext() → buildNegotiationContext()
                              ↓
                    pdfContext (payload)
                              ↓
                    pdfProposalBuilder(format)
                              ↓
        pdfLayoutEngine + pdfBlockRenderer (por bloco)
                              ↓
                    doc.save("proposta-freelancer.pdf")
```

### 2.3 Contratos de entrada/saída (alto nível)

- **PdfContext:** `{ state, effective, negotiation, strategist, proposalText, antiDiscountPhrases, validityText, ... }`
- **PdfBlock:** `{ type, content, minHeight, keepTogether, keepWithNext }`
- **LayoutResult:** `{ y, addPage, blockFits, remainingSpace }`

---

## 3. Estrutura narrativa final do PDF (top → bottom)

### 3.1 Ordem de leitura obrigatória

| # | Bloco | Conteúdo | Objetivo |
|---|-------|----------|----------|
| 1 | **Cabeçalho** | Logo (se houver) + "Proposta Estratégica para [Cliente]" + validade sutil | Autoridade e personalização |
| 2 | **Ancoragem de valor** | Valor Ganho Estimado / Impacto no Negócio (quando disponível) ou narrativa de valor | Primeiro bloco financeiro = benefício, não custo |
| 3 | **Escopo e prazo** | O que será feito; prazo estimado em dias úteis | Clareza do entregável |
| 4 | **Lógica de precificação** | Resumo executivo (sem detalhar custos internos); foco em premissas consultivas | Transparência sem expor margem |
| 5 | **Recomendação final** | Texto da proposta (getProposalTextForPdf) | Linguagem comercial |
| 6 | **Investimento do projeto** | Valor principal com tipografia serif; nunca "preço" ou "custo" | Fechamento com peso visual |
| 7 | **Rodapé viral** | Frases anti-desconto ou checklist de proteção de escopo (sutil) | Reduz pechincha |
| 8 | **Rodapé de confiança** | "Proposta estruturada e validada por [nome da ferramenta]" | Marca e credibilidade |

### 3.2 Regra de ouro

- **Investimento** aparece apenas após valor, escopo e prazo.
- **Terminologia:** sempre "Investimento do Projeto", nunca "preço", "custo" ou "orçamento".

---

## 4. Design System PDF

### 4.1 Cores

| Token | Uso | Valor (exemplo) |
|-------|-----|-----------------|
| `ink-950` | Fundo (se light) ou texto principal | `#070A12` |
| `ink-800` | Texto secundário | `#111A33` |
| `emerald-600` | Destaque, CTA, valor principal | `#059669` |
| `emerald-500` | Bordas sutis, linhas | `#10B981` |
| `slate-400` | Texto auxiliar, validade | `#94A3B8` |

**Tema:** Alinhado à UI (ink/emerald). Opção futura: versão light elegante (fundo branco, ink para texto).

### 4.2 Tipografia

| Uso | Fonte | Fallback | Tamanhos |
|-----|-------|----------|----------|
| Títulos, valor principal | Playfair Display (serif) | Georgia | 18–24pt títulos; 20–28pt investimento |
| Corpo, dados | Inter ou Helvetica (sans) | system-ui | 10–11pt |
| Números monetários | IBM Plex Mono (opcional) | monospace | 14–20pt |

**Fallback:** Se Playfair não carregar, usar Helvetica bold para títulos (elegância reduzida, mas legível).

### 4.3 Espaçamento

| Token | Valor | Uso |
|-------|-------|-----|
| `margin` | 56pt | Margens laterais e superior |
| `blockGap` | 24–32pt | Entre blocos |
| `lineHeight` | 1.4–1.5 | Corpo de texto |
| `titleSpacing` | 18–22pt | Abaixo de títulos |

### 4.4 Componentes

- **Bloco de valor:** Fundo sutil (emerald/5%), borda leve, tipografia serif para o número.
- **Bloco de texto:** Sem borda; espaçamento respirável.
- **Rodapé:** Fonte menor (8pt), cor slate, em todas as páginas.

### 4.5 Coerência com UI

- Mesma paleta ink/emerald.
- Mesma hierarquia: serif para destaque, sans para corpo.
- Mesmo tom de voz: consultivo, sem promessas absolutas.

---

## 5. Paginação e layout engine

### 5.1 Regras de quebra

| Regra | Descrição |
|-------|------------|
| **keepTogether** | Bloco não pode ser cortado no meio; se não couber, vai para próxima página |
| **keepWithNext** | Bloco deve ficar na mesma página que o próximo (ex.: título + primeiro parágrafo) |
| **orphanControl** | Evitar 1–2 linhas sozinhas no topo da página (mín. 3 linhas ou bloco inteiro) |
| **footerReserved** | Reservar ~60pt no rodapé de cada página para "Proposta estruturada por..." |

### 5.2 Algoritmo de paginação (alto nível)

1. Para cada bloco, calcular `blockHeight` (estimativa ou medida real).
2. Se `y + blockHeight > pageHeight - margin - footerReserved`:
   - Se bloco tem `keepTogether` e `blockHeight` cabe em uma página: `addPage()`, depois renderizar.
   - Se bloco pode ser quebrado (ex.: texto longo): renderizar até encher página, `addPage()`, continuar.
3. Após renderizar bloco, atualizar `y`.
4. Rodapé: desenhar em `pageHeight - margin - footerHeight` em toda página.

### 5.3 Prevenção de corte de blocos

- Blocos atômicos: cabeçalho, valor ganho, escopo, investimento, rodapé viral.
- Cada um tem `minHeight`; antes de renderizar, checar `remainingSpace >= minHeight`.
- Se não couber: `addPage()`, resetar `y`, então renderizar.

---

## 6. Estratégia de assets

### 6.1 Logo

- **Fonte:** `logoDataUrl` (base64) já existente no app.
- **Fallback:** Se `logoDataUrl` for null ou falhar ao carregar: omitir logo; layout ajusta (mais espaço para título).
- **Dimensões:** Máx. 180×60pt (proposal) ou 120×40pt (interno); proporção mantida.

### 6.2 Fontes (Playfair + fallback)

- **Playfair Display:** jsPDF suporta fontes customizadas via `addFont()`; carregar de URL ou base64.
- **Fallback:** Se Playfair falhar (rede, CORS, formato): usar Helvetica bold para títulos. PDF continua elegante, porém menos distintivo.
- **Inter/Helvetica:** jsPDF já inclui Helvetica; usar como corpo.
- **Estratégia:** Tentar carregar Playfair no init do builder; em caso de erro, setar flag `useFallbackFonts` e prosseguir.

---

## 7. Compatibilidade: Completo vs Compacto

### 7.1 Formato Completo

- Todas as seções da estrutura narrativa (seção 3).
- Múltiplas páginas permitidas.
- Inclui: ancoragem de valor, escopo, prazo, lógica, recomendação, investimento, rodapé viral, justificativas (se houver).

### 7.2 Formato Compacto (1 página)

- Mesma ordem narrativa, porém condensada.
- Blocos em versão "compact": menos texto, tamanhos menores.
- Investimento e rodapé obrigatórios.
- Se não couber em 1 página: priorizar cabeçalho, valor ganho (ou fallback), escopo/prazo, investimento, rodapé. Cortar ou resumir justificativas.

### 7.3 Contrato de compatibilidade

- **Dados:** Nenhuma alteração em `getStateFromInputs`, `buildPricingContext`, `compute`, `projectNet`.
- **Flags:** `pdf_v2_enabled`, `pdf_internal_compact_enabled`, `pdf_impact_block_enabled` continuam funcionando.
- **Modos:** `proposalMode` (cliente) vs interno (completo/compacto) preservados.

---

## 8. Evolução futura: Cenário A/B

### 8.1 Preparação (sem ativar no V1)

- **Arquitetura:** `pdfProposalBuilder` recebe `context` que pode incluir `scenarioA` e `scenarioB`.
- **Bloco plugável:** Interface `PdfBlock` com `type: "scenario-comparison"`; renderer retorna `heightUsed` e pode ser "no-op" se cenários não existirem.
- **Dados:** Estrutura de cenários já existe no app; apenas passar para o context.

### 8.2 Ativação futura

- Nova flag `pdf_scenario_comparison_enabled`.
- Quando ON: bloco "Cenário A vs B" inserido após escopo, antes do investimento.
- Layout: duas colunas ou blocos lado a lado (se espaço) ou empilhados.

---

## 9. Plano de execução por fases

### Fase 1: Arquitetura e design system (esforço: M)

- Extrair `pdfContext`, `pdfDesignSystem`, `pdfLayoutEngine` (stubs).
- Definir tokens e regras de paginação.
- **Dependências:** Nenhuma.
- **Risco:** Baixo.

### Fase 2: Layout engine e paginação (esforço: M)

- Implementar `keepTogether`, `ensureSpace` inteligente, reserva de rodapé.
- Testes com blocos de altura variável.
- **Dependências:** Fase 1.
- **Risco:** Médio (edge cases de quebra).

### Fase 3: Estrutura narrativa e blocos (esforço: L)

- Reordenar blocos conforme seção 3.
- Criar renderers para cada bloco (cabeçalho, valor ganho, escopo, investimento, rodapé).
- Integrar Playfair com fallback.
- **Dependências:** Fase 1, 2.
- **Risco:** Médio.

### Fase 4: Formato Compacto (esforço: M)

- Versões compactas dos blocos.
- Garantir 1 página ou priorização clara.
- **Dependências:** Fase 3.
- **Risco:** Baixo.

### Fase 5: Rodapé viral e polish (esforço: S)

- Frases anti-desconto; rodapé "Proposta estruturada por...".
- Ajustes visuais finais.
- **Dependências:** Fase 3.
- **Risco:** Baixo.

### Fase 6: Testes e rollout (esforço: M)

- Testes manuais: proposalMode, completo, compacto, com/sem logo, com/sem strategist.
- Rollout com flag `pdf_executive_proposal_enabled` (default: false).
- **Dependências:** Fases 1–5.
- **Risco:** Médio.

---

## 10. Critérios de aceite (checklist objetivo)

- [ ] PDF em proposalMode segue ordem: cabeçalho → valor ganho → escopo → prazo → recomendação → investimento → rodapé.
- [ ] Investimento nunca aparece antes de valor/escopo/prazo.
- [ ] Terminologia: "Investimento do Projeto", nunca "preço" ou "custo".
- [ ] Tipografia: títulos em serif (Playfair ou fallback); corpo em sans.
- [ ] Nenhum bloco cortado no meio da página.
- [ ] Rodapé "Proposta estruturada por [ferramenta]" em todas as páginas.
- [ ] Formato Completo e Compacto funcionam com os mesmos dados.
- [ ] Sem logo: layout ajusta; PDF continua elegante.
- [ ] Playfair falha: fallback para Helvetica; PDF gera sem erro.
- [ ] `npm test` e smoke passam.
- [ ] Compatibilidade retroativa: dados atuais geram PDF válido.

---

## 11. Plano de rollout + rollback

### 11.1 Rollout

1. **Flag:** `pdf_executive_proposal_enabled: false` (default).
2. **Deploy:** Código em produção com flag OFF; PDF atual permanece.
3. **Testes em staging:** Ativar flag; validar todos os formatos e cenários.
4. **Gradual:** Ativar para % de usuários ou por feature-flag remota (se houver).
5. **Full:** Flag ON para todos; monitorar erros e feedback.

### 11.2 Rollback

1. **Imediato:** `pdf_executive_proposal_enabled: false` → volta ao PDF atual.
2. **Sem redeploy:** Se flag for configurável via URL/param, rollback em segundos.
3. **Fallback de código:** Manter função `generatePdfLegacy` ou branch condicional; se novo builder falhar, chamar legado.

---

## Não-objetivos do V1

- **Cenário A/B no PDF:** Preparar arquitetura, não ativar.
- **Tema light:** Manter dark/ink; light é evolução futura.
- **Editor de blocos:** Usuário não customiza ordem ou conteúdo no V1.
- **Múltiplos idiomas:** Manter pt-BR apenas.
- **Assinatura digital:** Fora do escopo.
- **Alteração de cálculo:** Nenhuma mudança em `compute`, `projectNet` ou fórmulas.

---

## Top 5 riscos da implementação

| # | Risco | Mitigação |
|---|-------|-----------|
| 1 | **Playfair não carregar** (CORS, CDN) | Fallback para Helvetica; testar em rede restrita |
| 2 | **Quebra de bloco em edge cases** | Testes com textos longos; `minHeight` conservador |
| 3 | **Regressão no PDF atual** | Flag OFF por padrão; testes de paridade antes do merge |
| 4 | **Logo corrompe ou quebra layout** | Try/catch; omitir logo em caso de erro |
| 5 | **Compacto não caber em 1 página** | Priorização clara; cortar blocos menos críticos; aviso se truncado |

---

## Decisões fechadas (sem reabrir)

### 1) Ordem com strategist OFF

- **Regra:** Sempre manter "Ancoragem de Valor" antes de "Escopo/Prazo".
- **Fallback textual** (strategist OFF ou sem dados):  
  *"Impacto no negócio orientado por previsibilidade, velocidade de entrega e redução de risco operacional."*
- **Não** exibir placeholder "preencha dados estratégicos" no PDF cliente.

### 2) Rodapé viral / anti-desconto

- **Fonte:** Frases existentes do sistema (`getAntiDiscountPhrases`) com curadoria.
- **Regra de exibição:**
  - **Completo:** até 3 frases curtas.
  - **Compacto:** 1 frase curta.
- Tom consultivo, sem agressividade comercial.

### 3) Formato Compacto

- **Regra fixa:** 1 página obrigatória.
- Se conteúdo exceder: aplicar priorização e truncamento; **nunca** gerar 2ª página.
- **Ordem de prioridade:** Cabeçalho > Ancoragem de Valor > Escopo/Prazo > Investimento > Rodapé confiança.
- Blocos menos críticos (ex.: justificativas longas) devem ser resumidos.

### 4) Flag de rollout

- **Nome final:** `pdf_executive_proposal_enabled`.
- **Comportamento:**
  - `false`: fluxo legado atual.
  - `true`: novo builder executivo.
- **Não remover** `pdf_v2_enabled` agora; manter compatibilidade e usar somente como suporte do legado.

### 5) Tipografia Playfair no PDF

- **Estratégia V1:** fallback-first.
- Tentar Playfair customizada; se falhar, usar Helvetica sem quebrar geração.
- **Não bloquear** release por causa da fonte.
- Embutir base64 da Playfair fica para **V1.1** (não para este PR).

---

## Ações obrigatórias

1. **Atualizar a data** no documento para rastreabilidade. ✓ (2026-03-06)
2. **PR1 — escopo fechado:**
   - Extração de arquitetura (`pdfContext`, `pdfDesignSystem`, `pdfLayoutEngine`, `pdfProposalBuilder`)
   - Paginação anti-corte (`keepTogether`, `keepWithNext`, `footerReserved`)
   - Nova ordem narrativa executiva no formato **Completo**
   - Sem mexer em cálculo financeiro
