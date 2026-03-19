# 65_REPORT_PDF_FOOTER_TRUNCATION_FIX

## Objetivo
Corrigir o rodapé do PDF que ainda estava truncando/encavalando em linhas longas.

## Causa
O rodapé estava sendo desenhado pela mesma rotina tokenizada do corpo do relatório.
Como o texto era centralizado e desenhado palavra por palavra, a estimativa de espaço entre tokens ficava apertada demais em algumas combinações de endereço/telefone, causando aparência truncada.

## Ajuste aplicado
- o rodapé agora usa renderização própria em linhas completas
- a quebra de linha do rodapé passou a considerar o texto inteiro, preservando melhor os espaços
- o tamanho da fonte do rodapé passa a se ajustar levemente quando a linha fica longa
- o espaçamento vertical do rodapé foi aumentado

## Impacto esperado
- endereço e telefones deixam de sair encavalados
- o rodapé fica mais legível e estável
- a correção afeta apenas a composição do rodapé, sem mexer no restante do layout
