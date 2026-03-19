# 74_REPORT_BODY_PARAGRAPH_SPACING_STRONGER_FIX

## Objetivo
Tornar o espaçamento de parágrafo do corpo do relatório PDF visualmente mais claro e coerente com o preview do editor em `/admin/report`.

## Problema consolidado
A quebra de parágrafo não estava sendo perdida, mas o preview e o PDF usavam métricas diferentes:

- preview com `lineHeight` maior e espaçamento estático
- PDF com `lineHeight`, `blankGap` e `blockGap` próprios
- sequências longas de linhas vazias eram achatadas cedo demais

Isso fazia o usuário perceber o corpo do PDF como mais “apertado”, mesmo quando a linha em branco existia.

## Ajuste aplicado
### 1) Métricas compartilhadas do corpo
Foi criada a constante:

- `REPORT_TEMPLATE_BODY_RENDER_METRICS`

Ela centraliza:
- `fontSize`
- `lineHeight`
- `blankGap`
- `blockGap`
- `ruleGap`
- `consecutiveBlankBoost`
- `maxBlankLines`

### 2) PDF alinhado ao corpo do preview
O builder do PDF passou a usar as métricas compartilhadas do corpo, em vez de números soltos locais.

Resultado:
- linha do corpo mais respirada
- parágrafo com separação mais perceptível
- espaçamento entre blocos mais consistente

### 3) Preview alinhado ao PDF
O preview do corpo em `AdminReportImportView` passou a:

- usar o mesmo `lineHeight` do corpo do PDF
- calcular o espaço do bloco em branco com a mesma lógica semântica
- aplicar reforço quando houver linhas em branco consecutivas

### 4) Preservação controlada de linhas em branco
O render do corpo agora mantém até **2 linhas em branco consecutivas** antes de normalizar excessos.

Isso permite:
- um parágrafo normal com espaço mais claro
- um respiro um pouco maior quando o usuário realmente inserir mais de uma linha em branco
- sem deixar o layout explodir por excesso de enters

## Arquivos afetados
- `src/lib/shared/reportTemplates.js`
- `src/lib/server/reportPdfBuilder.js`
- `src/components/Admin/AdminReportImportView.js`

## Resultado esperado
No editor e no PDF final, o corpo deve ficar mais próximo visualmente nos cenários abaixo:

1. quebra simples de linha
2. parágrafo com uma linha em branco
3. parágrafo com duas linhas em branco
4. bloco com TAGS como `{{cid}}`, `{{profissional}}` e `{{categoria_conteudo}}`

## Escopo
Ajuste focado no **corpo do relatório**. Cabeçalho e rodapé permanecem com comportamento próprio.
