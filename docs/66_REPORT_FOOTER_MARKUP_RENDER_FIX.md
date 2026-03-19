# 66 — Renderização das marcações do rodapé no PDF

## Problema
O rodapé estava saindo com as marcações literais, por exemplo:

- `[align=center]...[/align]`

Isso acontecia porque o rodapé estava sendo desenhado por uma rotina de texto simples, sem passar pelo parser de template usado no cabeçalho e no corpo.

## Correção aplicada
O rodapé passou a usar `buildTemplateRenderBlocks(...)` + `drawTemplateBlocks(...)`.

Com isso, o PDF agora interpreta as marcações do template no rodapé, incluindo:
- alinhamento
- quebras
- regras simples do editor

## Impacto
- remove as tags literais do rodapé
- respeita `[align=center]...[/align]`
- mantém o rodapé consistente com o restante do relatório
