# 72 — Normalização de Data de Nascimento no Relatório

## Objetivo
Garantir que o campo **Data de Nascimento** vindo da planilha apareça no sistema e no PDF apenas como data, sem o complemento de idade (anos, meses e dias).

## Regra aplicada
Quando a planilha trouxer valores como:

- `14/09/2012 - 13 anos 6 meses 2 dias`
- `14/09/2012 13 anos 6 meses`
- `14/09/2012`

o sistema passa a exibir:

- `14/09/2012`

## Pontos ajustados
- preparação da linha importada
- resolução da TAG `{{data_nascimento}}`
- manutenção da lógica de CID por idade

## Impacto
A lógica do CID continua funcionando normalmente, porque o cálculo de idade ainda usa a própria data de nascimento. A diferença é que a visualização e o uso da TAG agora mostram só a data.
