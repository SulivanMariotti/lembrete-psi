# Ajuste de layout da Importação sem regressão da aba Especialidades / Demandas

## Problema encontrado
Ao aplicar o ajuste visual para deixar **Resumo operacional do lote** e **Preview da validação** com largura total, a versão intermediária do componente acabou voltando o conteúdo da aba **Especialidades / Demandas** para o fluxo antigo de **Nova Demanda**.

Na prática:
- o rótulo da aba aparecia como **Especialidades / Demandas**
- mas o conteúdo exibido ainda era o formulário antigo de Demanda plana
- além disso, o resumo e o preview continuavam sem ocupar toda a largura da página

## Decisão aplicada
Foi feito um merge manual no arquivo `src/components/Admin/AdminReportImportView.js` para preservar simultaneamente:

1. o cadastro novo de **Especialidade -> Demandas**
2. o ajuste de layout da aba **Importação**

## O que ficou valendo
### Aba Importação
- o topo continua em duas colunas:
  - esquerda: importação do lote
  - direita: cards auxiliares
- o card **Resumo operacional do lote** agora ocupa largura total
- o card **Preview da validação** agora ocupa largura total

### Aba Especialidades / Demandas
- o clique na aba abre o formulário de **Nova Especialidade**
- a lista de **Especialidades cadastradas** aparece na coluna da esquerda
- a coluna da direita só libera o formulário de **Demanda** quando existe uma Especialidade selecionada
- a Demanda padrão continua disponível para Especialidades no modo `system_default`

## Arquivo principal alterado
- `src/components/Admin/AdminReportImportView.js`

## Como validar
1. abrir `/admin/report`
2. ir na aba **Importação**
3. conferir se:
   - o topo continua com a coluna lateral direita
   - o **Resumo operacional do lote** ocupa toda a largura
   - o **Preview da validação** ocupa toda a largura
4. ir na aba **Especialidades / Demandas**
5. conferir se:
   - aparece **Nova Especialidade**
   - aparece a lista de Especialidades
   - o painel de Demanda depende da Especialidade selecionada

## Observação
Não foi possível rodar lint local nesta etapa porque o ambiente atual não está com as dependências do projeto instaladas.
A alteração foi feita reaproveitando JSX já existente no componente, reduzindo o risco de regressão estrutural.
