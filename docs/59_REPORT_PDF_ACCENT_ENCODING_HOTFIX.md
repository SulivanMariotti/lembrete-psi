# 59 — HOTFIX DE ACENTUAÇÃO NO PDF DE RELATÓRIOS

## Objetivo
Corrigir caracteres acentuados quebrados na geração do PDF do módulo `/admin/report`.

## Problema observado
Palavras como:
- RELATÓRIO
- CLÍNICO
- convênio
- está
- psicoterapêutico
- até
- há
- previsão

estavam saindo com caracteres incorretos no PDF.

## Causa raiz
O builder manual do PDF estava escrevendo texto com fonte Type1 padrão sem declarar a codificação `WinAnsiEncoding`.
Além disso, o conteúdo stream estava sendo serializado com caracteres estendidos diretamente, o que deixava a interpretação dos bytes ambígua para o leitor de PDF.

## Correção aplicada
### 1. Fonte com codificação explícita
As fontes agora são declaradas com:
- `/Encoding /WinAnsiEncoding`

### 2. Escape seguro dos textos
O texto agora é convertido para uma string PDF segura, usando:
- normalização `NFC`
- escape de `(`, `)` e `\`
- codificação octal para bytes fora do ASCII imprimível

### 3. Streams e objetos em ASCII
Os objetos e streams textuais do PDF passaram a ser serializados em ASCII, já que o conteúdo acentuado é enviado por escapes octais.

## Impacto
- corrige acentuação em português
- preserva nomes de pacientes, convênios e descrições
- reduz risco de quebra visual por encoding

## Como validar
1. Gerar novamente o PDF em `/admin/report`
2. Conferir palavras com acento no cabeçalho, corpo e rodapé
3. Validar especialmente:
   - RELATÓRIO CLÍNICO
   - convênio
   - está
   - até
   - há
   - previsão

## Arquivo alterado
- `src/lib/server/reportPdfBuilder.js`
