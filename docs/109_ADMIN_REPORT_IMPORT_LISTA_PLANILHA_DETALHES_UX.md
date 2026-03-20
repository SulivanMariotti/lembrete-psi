# 109_ADMIN_REPORT_IMPORT_LISTA_PLANILHA_DETALHES_UX

## Objetivo
Refinar a lista de leitura da planilha na aba `/admin/report` → **Importação**, reforçando a leitura operacional do lote linha a linha.

## O que mudou
- destaque visual mais forte para linhas `Pronto`, `Atenção` e `Erro`
- contadores por status dentro da própria seção de leitura
- ação `Ver detalhes` / `Ocultar detalhes` por linha
- painel expandido por linha com:
  - leitura original da planilha
  - resolução do sistema
  - status da linha
  - resumo operacional

## Arquivo impactado
- `src/components/Admin/report-import/ReportImportFlowPanel.js`

## Decisão de UX
A leitura linha a linha passou a funcionar como painel operacional:
- primeiro o operador enxerga o volume por status
- depois localiza a linha pelo filtro/busca
- por fim abre a linha para revisar o detalhe sem sair do preview

## Como validar
1. Abrir `/admin/report`
2. Ir na aba **Importação**
3. Analisar uma planilha com linhas prontas e linhas com erro
4. Confirmar:
   - cards por status na seção de leitura
   - linhas de erro com destaque visual mais forte
   - botão `Ver detalhes` por linha
   - expansão mostrando leitura original + resolução do sistema + status

## Observação
Esta melhoria não altera a regra de negócio do import nem o snapshot; o foco foi exclusivamente a UX operacional da inspeção do preview.
