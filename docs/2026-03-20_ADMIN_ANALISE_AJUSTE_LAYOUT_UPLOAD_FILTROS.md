# Admin / Análise — ajuste de layout do fluxo inicial

## Objetivo
Simplificar a experiência inicial da tela `/admin/analise` para deixar o fluxo em sequência visual simples:

1. Upload da planilha
2. Filtros da análise

## O que foi alterado
- Upload da planilha e filtros da análise deixaram de ficar lado a lado.
- Os dois blocos agora aparecem em sequência vertical.
- Foram removidos da interface os cards:
  - `Campos usados na análise`
  - `Colunas detectadas`

## Motivo
Reduzir ruído visual e deixar a tela mais direta para o uso operacional do Admin.

## Impacto
- O motor de análise não mudou.
- O endpoint não mudou.
- O preview das linhas e os resultados continuam disponíveis.
- O usuário passa a ver primeiro:
  1. Upload da planilha
  2. Filtros da análise
  3. Resumo e resultados

## Como validar
1. Abrir `/admin/analise`
2. Confirmar que `1. Upload da planilha` aparece primeiro
3. Confirmar que `2. Filtros da análise` aparece logo abaixo
4. Confirmar que não existem mais os blocos `Campos usados na análise` e `Colunas detectadas`
5. Rodar uma análise e validar que resultados, exportação e preview continuam funcionando
