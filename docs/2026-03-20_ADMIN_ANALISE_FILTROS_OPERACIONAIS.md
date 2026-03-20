
# Admin / Analise — Filtros operacionais antes da varredura

## Objetivo
Adicionar filtros no módulo `/admin/analise` para o Admin controlar quais linhas entram na análise de duplicidade antes do processamento das regras.

## Escopo do passo
Foram adicionados filtros de:

1. **Status**
   - analisar todos os status
   - ou restringir para uma lista selecionada pelo Admin

2. **Período**
   - data inicial
   - data final
   - comparação feita a partir de `Data e hora Agendada`

3. **Pacientes especiais**
   - marcadores textuais para ignorar (ex.: `LIVRE`, `BLOQUEADO`)
   - opção para ignorar nome de paciente vazio

## Regras aplicadas neste passo
### Status
- quando o modo está em `Todos os status`, a análise usa todos os valores encontrados no arquivo
- quando o modo está em `Filtrar por status`, apenas os status selecionados entram na análise
- linhas fora desse recorte vão para `Linhas ignoradas`

### Período
- o filtro usa `Data e hora Agendada`
- `data inicial` é inclusiva no começo do dia
- `data final` é inclusiva até o fim do dia
- linhas sem data legível também são retiradas quando o filtro de período está ativo

### Pacientes especiais
- o Admin pode informar marcadores textuais separados por vírgula, ponto e vírgula ou quebra de linha
- a comparação ignora maiúsculas/minúsculas e acentos
- `LIVRE` continua sendo tratado como marcador especial
- nome de paciente vazio pode ser ignorado por checkbox

## Decisão técnica
### Opção escolhida
Aplicar os filtros **antes** de montar os grupos de duplicidade/conflito.

### Por quê
- evita falso positivo
- mantém CSV e tela alinhados ao mesmo recorte operacional
- deixa claro por que determinada linha foi removida da análise

### Impacto
A API agora recebe filtros junto do upload e devolve:

- filtros efetivamente aplicados
- resumo dos filtros
- contadores de linhas filtradas por status
- contadores de linhas filtradas por período
- contadores de pacientes especiais ignorados

## Pontos técnicos importantes
- a data/hora da planilha é normalizada no servidor para permitir comparação de período
- o parser aceita datas em texto (`dd/mm/yyyy hh:mm`) e também número serial do Excel, quando aplicável
- a exportação CSV continua gerada no cliente, mas agora respeita integralmente o recorte filtrado

## Arquivos envolvidos
- `src/components/Admin/AdminAnalysisView.js`
- `src/app/api/admin/analysis/excel-preview/route.js`
- `src/lib/server/adminExcelAnalysis.js`
- `src/lib/adminAnalysisExport.js`
- `tests/admin-analysis/adminExcelAnalysis.test.mjs`

## Como validar
1. acessar `/admin/analise`
2. enviar um `.xlsx`
3. escolher `Filtrar por status` e marcar, por exemplo, `Agendado` e `Confirmado`
4. opcionalmente definir um período
5. informar marcadores como `LIVRE`
6. clicar em `Analisar duplicidades`
7. conferir:
   - resumo dos filtros aplicados
   - contagem de linhas filtradas por status
   - contagem de linhas filtradas por período
   - contagem de pacientes especiais ignorados
   - exportação CSV refletindo o mesmo resultado

## Observações
- a exceção de convênio contendo `neuro` permanece ativa e visível na tela
- linhas ignoradas continuam exportáveis em CSV com o motivo do descarte
