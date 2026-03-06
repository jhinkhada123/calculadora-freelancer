# Fase 1 – Entrega: Split-Screen (ui_split_enabled)

**Data:** 2025-03-02  
**Status:** Concluído

---

## 1. Arquivos alterados

| Arquivo | Alterações |
|---------|------------|
| `index.html` | 3 mudanças (flag, id, controlador) |

---

## 2. Diff de classes/layout

### 2.1 FEATURE_FLAGS (linha ~1337)

```diff
      const FEATURE_FLAGS = {
        ...
        pdf_internal_compact_enabled: false,
+       ui_split_enabled: false,
      };
```

### 2.2 Container principal (linha ~352)

```diff
    <main class="relative">
-     <div class="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-14 lg:grid-cols-12">
+     <div id="mainGrid" class="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-14 lg:grid-cols-12">
```

### 2.3 Controlador de flag (init, linha ~4189)

```diff
      try {
        (function init() {
+         const grid = document.getElementById("mainGrid");
+         if (grid) grid.setAttribute("data-ui-split", FEATURE_FLAGS.ui_split_enabled ? "true" : "false");
          if (isClientView()) {
```

---

## 3. Comportamento

| Flag | Comportamento |
|------|---------------|
| `ui_split_enabled: false` | Paridade total com estado anterior. Layout inalterado. `data-ui-split="false"` no container. |
| `ui_split_enabled: true` | Mesmo layout. `data-ui-split="true"` no container para uso futuro. |

**Layout atual:** Já em split no desktop (`lg:grid-cols-12`, `section lg:col-span-7`, `aside lg:col-span-5`). Nenhuma classe condicional alterada. Sem mudanças visíveis em nenhum valor da flag.

---

## 4. Não regressão

- [x] `compute` / `projectNet` não alterados
- [x] `view=client` preservado
- [x] share / export / import preservados
- [x] termos / compliance / rotas preservados
- [x] PDF cliente/interno preservados
- [x] Nenhuma lógica de cálculo alterada

---

## 5. Resultados de validação

| Validação | Resultado |
|-----------|-----------|
| **npm test** | 8 suites, 66 testes passando |
| **Smoke rotas** | GO-LIVE READY |

---

## 6. Veredito

**GO-LIVE READY**

Fase 1 concluída. Infraestrutura de flag e controlador prontos. Paridade total com `ui_split_enabled=false`. Pronto para aprovação da Fase 2 (wizard).
