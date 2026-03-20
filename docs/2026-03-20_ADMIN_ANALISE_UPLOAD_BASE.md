# Admin /admin/analise — base de upload Excel (2026-03-20)

## Objetivo
Preparar a nova rota administrativa `/admin/analise` para receber uma planilha `.xlsx`, validar a estrutura da primeira aba e devolver um preview consistente das linhas antes da implementação das regras de duplicidade.

## Escopo entregue neste passo
- nova rota client-side `/admin/analise`
- autenticação admin igual ao padrão já usado em `/admin/report`
- tela de upload com preview do arquivo selecionado
- endpoint seguro `POST /api/admin/analysis/excel-preview`
- parser server-side reaproveitando `xlsxLite`
- retorno com:
  - nome do arquivo
  - aba lida
  - linha do cabeçalho
  - colunas detectadas
  - chaves internas sugeridas
  - preview das primeiras linhas úteis
  - premissas desta leitura
- atalho no menu principal do Admin para abrir `/admin/analise`

## Decisão técnica
### Opção escolhida
Usar o parser interno `src/lib/server/xlsxLite.js` em vez de adicionar nova dependência de Excel.

### Por quê
- evita aumentar o bundle com biblioteca nova
- reduz risco de conflito de versão
- mantém o padrão de leitura server-side já usado no projeto

### Impacto
A primeira versão foca em `.xlsx` na aba 1, suficiente para a pré-análise estrutural e para o próximo passo de regras de duplicidade.

## Estrutura reconhecida da planilha enviada
Arquivo de referência analisado:
- `Amplimed - Gestão de Clínicas (7).xlsx`

Cabeçalhos detectados:
1. Cód profissional
2. Profissional
3. Conselho
4. Especialidade
5. Cód paciente
6. Paciente
7. Data de Nascimento
8. Data e hora Agendada
9. Convênio
10. Status

## Regras de negócio assumidas neste passo
- a primeira linha não vazia da aba 1 é o cabeçalho
- linhas totalmente vazias abaixo do cabeçalho são ignoradas
- o preview devolve o número real da linha da planilha
- os valores passam por limpeza visual básica:
  - trim
  - remoção de `NBSP`
  - compactação de espaços duplicados
- as regras de duplicidade ainda não são aplicadas nesta etapa

## Próximo passo esperado
Receber do usuário as regras que definem duplicidade, por exemplo:
- duplicado por `cód paciente`
- duplicado por `paciente + data e hora agendada`
- duplicado por `profissional + paciente + data e hora agendada`
- duplicado por qualquer outra combinação de colunas

## Validação manual
1. Entrar como admin.
2. Abrir `/admin/analise`.
3. Selecionar um arquivo `.xlsx`.
4. Clicar em **Ler estrutura do Excel**.
5. Confirmar:
   - aba lida
   - número de colunas
   - número da linha do cabeçalho
   - preview das linhas
   - colunas detectadas com chave interna

## Arquivos envolvidos
- `src/app/admin/analise/page.js`
- `src/components/Admin/AdminAnalysisView.js`
- `src/app/api/admin/analysis/excel-preview/route.js`
- `src/lib/server/adminExcelAnalysis.js`
- `src/components/Admin/AdminPanelView.js`
