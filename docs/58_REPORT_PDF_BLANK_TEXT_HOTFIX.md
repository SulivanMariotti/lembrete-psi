# 58 — Hotfix PDF em branco no módulo /admin/report

## Problema corrigido
O PDF podia sair aparentemente em branco, mesmo com dados válidos.

## Causa
No builder manual do PDF, o bloco de cada relatório era preenchido com fundo branco usando cor de preenchimento (`rg`).
Depois disso, a cor **de traço** era resetada para preto (`G`), mas a cor **de preenchimento do texto** continuava branca.

Como o texto do PDF usa a cor de preenchimento atual, o conteúdo era desenhado em branco sobre fundo branco.

## Correção aplicada
Arquivo alterado:
- `src/lib/server/reportPdfBuilder.js`

Ajustes:
1. Após o preenchimento branco do bloco, a cor de preenchimento volta para preto com `0 g`
2. A função `drawText()` também força texto em preto antes de desenhar qualquer linha

## Impacto
- o conteúdo do relatório volta a aparecer normalmente
- correção vale para cabeçalho, corpo e rodapé do relatório
- não altera a regra de layout:
  - A4 paisagem
  - 2 relatórios por página
  - lado a lado

## Como validar
1. Abrir `/admin/report`
2. Selecionar um modelo com conteúdo em cabeçalho/corpo/rodapé
3. Importar a planilha
4. Gerar o PDF
5. Confirmar que o texto aparece normalmente

## Observação
Este hotfix corrige a renderização do texto no PDF.  
A evolução para um editor mais rico/visual pode ser feita no próximo passo sem depender desta correção.
