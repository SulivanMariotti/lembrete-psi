# 85 — Ajuste de layout no `/admin/report`

## Objetivo
Fazer com que os blocos **Resumo operacional do lote** e **Preview da validação** ocupem toda a largura útil da página na aba **Importação**.

## O que foi alterado
No componente `src/components/Admin/AdminReportImportView.js` o grid da aba **Importação** foi reorganizado assim:

- linha superior:
  - coluna esquerda: `Importar planilha e validar lote`
  - coluna direita: cards laterais de apoio
- linha inferior:
  - `Resumo operacional do lote` com `xl:col-span-2`
  - `Preview da validação` com `xl:col-span-2`

## Resultado esperado
Em telas largas:

- os cards laterais continuam no topo à direita
- o resumo do lote ocupa a largura total abaixo
- o preview ocupa a largura total abaixo

## Impacto
- melhora a leitura do resumo e da tabela
- reduz área vazia à direita no preview
- não altera a lógica de importação ou geração de PDF

## Como validar
1. Abrir `/admin/report`
2. Ir para a aba **Importação**
3. Importar uma planilha para exibir o preview
4. Confirmar que:
   - `Resumo operacional do lote` ocupa toda a largura
   - `Preview da validação` ocupa toda a largura
   - os cards laterais permanecem apenas na primeira linha
