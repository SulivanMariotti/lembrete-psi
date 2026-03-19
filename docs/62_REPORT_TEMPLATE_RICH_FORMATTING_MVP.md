# 62_REPORT_TEMPLATE_RICH_FORMATTING_MVP

## Objetivo
Simplificar a montagem do Modelo de Relatório e dar controle real sobre:
- ordem do conteúdo
- alinhamento
- peso do texto
- tamanho da fonte
- linha horizontal
- uso das TAGS automáticas

## O que foi alterado

### Editor do modelo
O cadastro do Modelo de Relatório agora continua em texto livre, mas com uma camada de formatação controlada via marcações.

### Atalhos de formatação suportados
- `[b]...[/b]` → negrito
- `[i]...[/i]` → itálico
- `[u]...[/u]` → sublinhado
- `[align=left]...[/align]`
- `[align=center]...[/align]`
- `[align=right]...[/align]`
- `[align=justify]...[/align]`
- `[size=10]...[/size]`
- `[size=12]...[/size]`
- `[size=14]...[/size]`
- `[size=16]...[/size]`
- `[hr]` → linha horizontal

## Regras de uso
- a ordem do relatório continua sendo a ordem escrita no editor
- as TAGS `{{...}}` continuam sendo substituídas pelos dados reais
- os botões do editor inserem as marcações acima no texto
- o preview do admin tenta refletir a mesma hierarquia visual do PDF

## PDF
O gerador do PDF foi atualizado para interpretar:
- negrito
- itálico
- sublinhado
- alinhamento à esquerda/centro/direita/justificado
- tamanhos básicos de fonte
- linha horizontal

## Ajustes visuais
- o cabeçalho passou a respeitar a largura disponível antes da caixa de metadados
- o preview passou a usar a mesma lógica de blocos renderizados
- a sobreposição do título com a caixa lateral foi reduzida

## Como validar
1. Acessar `/admin/report`
2. Ir em **Modelos**
3. Criar ou editar um modelo
4. Aplicar formatação com os atalhos
5. Inserir TAGS no texto
6. Conferir o preview da página
7. Gerar o PDF
8. Validar se:
   - a ordem está correta
   - o alinhamento aparece como configurado
   - o tamanho do texto muda
   - negrito/itálico/sublinhado aparecem
   - o cabeçalho não invade mais a caixa lateral

## Observação
Nesta etapa a formatação continua controlada para manter o PDF estável. Não foi liberado posicionamento absoluto ou escolha livre de qualquer fonte.
