# Contexto de design obrigatório (design polish)

**Não assumir; seguir explicitamente.**

---

## Contexto do rollback PR #17

- O **design-polish anterior foi revertido** no hotfix (PR #17).
- **Não reutilizar código antigo** sem validar encoding e bindings.
- Esta fase parte da base limpa pós-revert.

---

## Falhas históricas que NÃO podem voltar

1. **Mojibake**  
   Ex.: `PrecificaÃ§Ã£o`, `mÃªs`  
   - Sem substituição automática global de encoding.  
   - Toda string alterada com acento deve ser **revisada no diff**.

2. **HUD mostrando "-" enquanto bloco do motor tem valores**  
   - Os valores exibidos no HUD devem vir do motor; não pode haver "-" quando o resultado já tem número.

---

## Guardrails técnicos

- **Sem auto-conversão global de encoding.** Nenhuma substituição automática em massa.
- **Revisão de strings com acento no diff.** Toda string alterada com acento deve ser revisada no diff antes do commit.
- IDs de HUD em `index.html` devem casar 1:1 com as chaves de `els` em `app.js`.
- Nenhum fallback local de cálculo no UI; fonte única = motor.

---

## HUD binding keys (index.html ↔ app.js/els)

Lista exata de IDs que devem casar 1:1 entre `index.html` e `els` em `app.js`:

- `pricingHudShell`
- `pricingHudHeroMetric`
- `pricingHudHeroValue`
- `pricingHudHeroTag`
- `pricingHudRiskMetric`
- `pricingHudRiskDot`
- `pricingHudRiskLabel`
- `pricingHudFloorMetric`
- `pricingHudFloorValue`
- `pricingHudSustainableMetric`
- `pricingHudSustainableValue`
- `pricingHudIdealValue`

---

## Vocabulário canônico desta fase

### Trace metrics

- `heroPrice`
- `sustainablePrice`
- `floorPrice`
- `riskIndicator`

### HUD attrs

- `data-trace-metric="heroPrice"` | `data-trace-metric="sustainablePrice"` | `data-trace-metric="floorPrice"` | `data-trace-metric="riskIndicator"`

### Input attrs

- `data-input-key="..."` (chave canônica do input)

### UI state (UI-only, sem persistência)

- `activeMetric` — métrica ativa em foco
- `activeInputKeys` — conjunto de chaves de input ativas

---

## Meta visual desta fase

| Elemento | Papel |
|----------|--------|
| **Hero HUD** | Dominante |
| **Faixa (Piso / Sust. / Ideal)** | Secundária e coesa |
| **Risco** | Visível porém discreto |
| **Scan order** | hero → faixa → risco → labels |

---

## Hero HUD exact visual checklist (pass 1)

### 1. Dominância do Hero

- [ ] Hero HUD é o elemento visual mais proeminente na área de resultados.
- [ ] Tamanho de fonte do hero ≥ 2× o da faixa secundária.
- [ ] Contraste e peso visual do hero superiores aos demais blocos.
- [ ] Hero ocupa posição de destaque (topo ou centro da área de resultados).

### 2. Faixa (Piso / Sust. / Ideal)

- [ ] Faixa exibida como bloco coeso, visualmente agrupado.
- [ ] Piso, Sustentável e Ideal claramente diferenciados (labels ou ícones).
- [ ] Faixa secundária em relação ao hero (menor tamanho, menor peso).
- [ ] Ordem de leitura: Piso → Sustentável → Ideal (ou equivalente canônico).

### 3. Risco

- [ ] Risco visível mas discreto (não compete com hero nem faixa).
- [ ] `riskIndicator` com `data-trace-metric="riskIndicator"`.
- [ ] Estilo visual mais sutil que hero e faixa (opacidade, tamanho ou cor).

### 4. Scan order

- [ ] Ordem de escaneamento visual: hero → faixa → risco → labels.
- [ ] Layout e hierarquia respeitam essa ordem (posição, tamanho, contraste).

### 5. Bindings e dados

- [ ] Todos os valores do HUD vêm do motor; nenhum "-" quando o motor retorna número.
- [ ] IDs em `index.html` casam 1:1 com `els` em `app.js`.
- [ ] Nenhum fallback local de cálculo no UI.

### 6. Encoding e strings

- [ ] Sem mojibake em nenhum label ou valor exibido.
- [ ] Strings com acento revisadas no diff.
- [ ] Sem substituição automática global de encoding.

### 7. Atributos de trace

- [ ] Hero HUD com `data-trace-metric="heroPrice"`.
- [ ] Faixa Piso com `data-trace-metric="floorPrice"`.
- [ ] Faixa Sustentável com `data-trace-metric="sustainablePrice"`.
- [ ] Risco com `data-trace-metric="riskIndicator"`.
- [ ] Inputs com `data-input-key="..."` conforme vocabulário canônico.

---

*Documento de referência para a fase de design polish pós–PR #17. Sem este doc completo, é NO-GO.*
