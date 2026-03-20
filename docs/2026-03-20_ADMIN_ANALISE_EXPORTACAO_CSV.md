# Admin / Analise — Exportação operacional em CSV

## Objetivo
Adicionar saída operacional no módulo `/admin/analise` para o Admin baixar os resultados da varredura em arquivos CSV separados por tipo.

## Escopo do passo
Foram adicionados 3 arquivos de exportação:

1. `duplicidades-exatas.csv`
2. `conflitos-profissional.csv`
3. `linhas-ignoradas.csv`

## Regras da exportação
Cada CSV inclui:

- linha original da planilha
- tipo de ocorrência
- motivo do apontamento
- código e nome do paciente
- especialidade
- código e nome do profissional
- data e hora agendada
- convênio
- status
- flag se o convênio contém `neuro`

## Decisão técnica
### Opção escolhida
Gerar o CSV no cliente a partir do resultado da análise retornado pela API.

### Por quê
- evita um endpoint extra apenas para download
- reutiliza o resultado já obtido na análise
- mantém a exportação rápida para o Admin

### Impacto
A resposta da análise agora devolve também a lista completa de `ignoredRows`, não apenas o preview, para permitir exportação integral das linhas ignoradas.

## Arquivos envolvidos
- `src/components/Admin/AdminAnalysisView.js`
- `src/lib/adminAnalysisExport.js`
- `src/lib/server/adminExcelAnalysis.js`
- `tests/admin-analysis/adminAnalysisExport.test.mjs`
- `tests/admin-analysis/adminExcelAnalysis.test.mjs`

## Como validar
1. Acessar `/admin/analise`
2. Enviar um `.xlsx`
3. Clicar em `Analisar duplicidades`
4. Conferir a seção `Exportação dos resultados`
5. Baixar os 3 CSVs
6. Validar que os arquivos contêm:
   - linha original
   - motivo
   - dados principais da ocorrência

## Observações
- o CSV usa `;` como separador
- valores com `;`, aspas ou quebra de linha são escapados
- quando não houver linhas para um tipo, o botão permanece desabilitado
