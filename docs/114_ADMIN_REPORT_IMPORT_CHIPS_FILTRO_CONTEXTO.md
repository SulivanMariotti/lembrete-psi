# 114 — Admin / Report / Importação / Chips de filtro por contexto

## Objetivo
Melhorar a leitura operacional da lista linha a linha na aba `/admin/report` > Importação, permitindo aplicar filtros rápidos diretamente a partir da linha expandida.

## O que foi implementado
- chips clicáveis na expansão da linha para filtrar por:
  - Especialidade
  - Profissional
  - Demanda resolvida
- indicador visual de **filtro contextual ativo**
- ação de **limpar filtro contextual**
- persistência do filtro contextual na sessão atual do navegador

## Arquivo alterado
- `src/components/Admin/report-import/ReportImportFlowPanel.js`

## Regra de UX
- clicar no chip aplica o filtro contextual
- clicar no mesmo chip novamente remove o filtro
- o filtro contextual se soma aos filtros já existentes da tabela
- a preferência fica salva apenas na sessão atual

## Como validar
1. Abrir `/admin/report`
2. Ir na aba **Importação**
3. Analisar uma planilha
4. Expandir uma linha com dados resolvidos
5. Clicar em um chip de:
   - Especialidade
   - Profissional
   - Demanda resolvida
6. Confirmar que a tabela passa a exibir apenas as linhas com o mesmo valor
7. Confirmar que aparece a faixa:
   - `Filtro contextual ativo`
8. Clicar em:
   - `Limpar filtro contextual`
9. Confirmar que a lista volta ao estado anterior

## Observação
A melhoria foi mantida no frontend, sem alterar a regra de negócio do import.
