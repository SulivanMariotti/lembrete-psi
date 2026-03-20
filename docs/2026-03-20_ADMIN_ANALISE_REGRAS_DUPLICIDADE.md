# Admin /analise — regras de duplicidade de agenda

Data: 2026-03-20

## Objetivo
Implementar a análise de uma planilha `.xlsx` no painel Admin para localizar:

1. **Duplicidade exata**
2. **Conflito de profissional na mesma especialidade**

## Regras de negócio implementadas

### Regra 1 — duplicidade exata
Uma linha entra como duplicidade quando existir outra linha com a mesma combinação:

- `Cód paciente`
- `Especialidade`
- `Cód profissional`
- `Data e hora Agendada`

> Observação: nomes são usados apenas para exibição. A comparação usa os códigos.

### Regra 2 — conflito de profissional na mesma especialidade
Uma linha entra como conflito quando existir, para o mesmo paciente e a mesma especialidade:

- mais de um `Cód profissional`

### Exceção da Regra 2
Linhas cujo campo `Convênio` contenha a palavra `neuro` são **retiradas da Regra 2**.

#### Detalhe da implementação
- a busca por `neuro` percorre o texto inteiro do campo
- a busca ignora maiúsculas/minúsculas
- exemplos aceitos:
  - `AMIL NEURO`
  - `SAO MIGUEL SAUDE NEURO`
  - `CARTÃO DE TODOS AV NEURO`

## Linhas ignoradas
Para evitar falso positivo, a análise ignora linhas com:

- `Paciente = LIVRE`
- `Cód paciente` vazio
- `Especialidade` vazia
- `Cód profissional` vazio

## Mapeamento automático de colunas
A análise detecta automaticamente, a partir do cabeçalho, os campos:

- Código do paciente
- Paciente
- Código do profissional
- Profissional
- Especialidade
- Data e hora agendada
- Convênio
- Status

A UI mostra:
- qual coluna foi usada em cada campo canônico
- campos obrigatórios faltando, se houver

## Estrutura da resposta da análise
O backend devolve:

- metadados do arquivo
- dados da aba lida
- cabeçalho e colunas detectadas
- preview das primeiras linhas
- resumo numérico da análise
- lista de grupos encontrados (`findings`)
- preview de linhas ignoradas

Cada item de `findings` retorna:
- tipo da regra
- paciente
- especialidade
- quantidade de linhas
- primeira linha
- resumo do grupo
- lista das linhas envolvidas

## Decisão importante
### Opção escolhida
Excluir as linhas com `Convênio` contendo `neuro` **somente da Regra 2**.

### Por quê
Isso evita falso positivo em troca de profissional quando a própria regra de negócio já define a exceção.

### Impacto
- `neuro` **não** anula a Regra 1
- `neuro` **não** bloqueia múltiplas especialidades
- `neuro` apenas retira a linha da validação de troca de profissional na mesma especialidade

## Validação usada neste passo
Foi feita validação com a planilha fornecida pelo usuário, resultando em:

- 16 grupos de duplicidade exata
- 50 grupos de conflito de profissional
- 404 linhas ignoradas por `Paciente = LIVRE`
- 98 linhas com `Convênio` contendo `neuro` fora da Regra 2

## Arquivos ligados a esta entrega
- `src/app/api/admin/analysis/excel-preview/route.js`
- `src/components/Admin/AdminAnalysisView.js`
- `src/lib/server/adminExcelAnalysis.js`
- `tests/admin-analysis/adminExcelAnalysis.test.mjs`
