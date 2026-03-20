# 108_ADMIN_REPORT_IMPORT_LISTA_LEITURA_PLANILHA

## Objetivo
Recolocar na aba `/admin/report` → **Importação** a leitura operacional da planilha linha a linha, mostrando se cada linha está **OK** ou com **erro/atenção**.

## Escopo aplicado
- `src/app/api/admin/report/import/route.js`
- `src/components/Admin/report-import/ReportImportFlowPanel.js`

## O que foi implementado
- retorno do preview para a UI com uma lista leve de linhas analisadas
- card novo **"Leitura da planilha • linha a linha"**
- busca textual por:
  - linha
  - paciente
  - profissional
  - especialidade
  - Demanda
  - Tags
  - CID
- filtros rápidos:
  - todas as linhas
  - só prontas
  - só com atenção
- tabela rolável com colunas operacionais:
  - linha
  - paciente / profissional
  - especialidade
  - demanda lida
  - demanda resolvida
  - CID / categoria
  - status

## Regra visual adotada
- linha `ready` aparece como pronta
- linha com qualquer `categoryStatus` diferente de `ready` aparece como atenção/erro
- o badge usa a mesma tradução oficial já existente em `categoryStatusToBadge`

## Observação técnica
O snapshot persistido continua podendo ser mais econômico que a resposta visual imediata do preview. A lista linha a linha foi pensada para **inspeção operacional da análise no momento da importação**, sem reabrir a regra do PDF.

## Como validar
1. abrir `/admin/report`
2. ir na aba **Importação**
3. selecionar categoria, modelo e `.xlsx`
4. clicar em **Analisar planilha**
5. validar que a seção **Leitura da planilha • linha a linha** aparece
6. conferir:
   - linhas prontas com badge de OK
   - linhas com problema mostrando o erro correspondente
   - busca funcionando
   - filtros funcionando
