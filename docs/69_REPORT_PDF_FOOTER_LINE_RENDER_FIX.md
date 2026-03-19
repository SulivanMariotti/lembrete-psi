# Hotfix — rodapé sem truncamento/encavalamento

## Problema
O rodapé ainda podia encavalar caracteres e números ao usar texto centralizado longo, mesmo após a correção anterior.

## Causa
O rodapé estava passando pelo render tokenizado do restante do template, que desenha palavra por palavra. Para linhas curtas isso funciona bem, mas no rodapé centralizado e com telefone/endereço longos isso podia gerar sobreposição visual.

## Correção aplicada
- Criação de uma rotina própria para renderizar blocos do rodapé
- Conversão dos segmentos do rodapé para texto plano por linha
- Desenho do rodapé como linha/bloco de texto, preservando espaços e centralização
- Manutenção das marcações de alinhamento já resolvidas antes do desenho

## Impacto esperado
- Endereço sem letras coladas
- Telefones sem números encavalados
- Rodapé centralizado com aparência mais estável
