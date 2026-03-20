# 115 — Admin Report Import — Hotfix de filtro contextual

## Objetivo
Corrigir erro de runtime na aba `/admin/report` > Importação após a melhoria de chips de filtro contextual.

## Problema
O componente `ReportImportFlowPanel.js` renderizava `activeFacetFilterLabel` e usava `handleClearFacetFilter`, mas os dois não estavam declarados no componente.

## Correção aplicada
- Declarado `activeFacetFilterLabel` a partir de `facetFilter.key` + `facetFilter.value`
- Declarado `handleClearFacetFilter()` para limpar o filtro contextual ativo
- Mantida a compatibilidade com a persistência em sessão já implementada

## Validação
- A aba Importação deve abrir sem `ReferenceError`
- A faixa `Filtro contextual ativo` deve aparecer normalmente quando um chip for acionado
- O botão `Limpar filtro contextual` deve funcionar
