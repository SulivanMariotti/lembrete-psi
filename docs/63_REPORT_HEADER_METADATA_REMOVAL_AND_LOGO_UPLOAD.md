# 63_REPORT_HEADER_METADATA_REMOVAL_AND_LOGO_UPLOAD

## Objetivo
Ajustar o layout do relatório PDF para:
- remover a caixa lateral de metadados no cabeçalho
- reduzir o risco de texto encavalado no cabeçalho
- permitir upload de logo da empresa no modelo de relatório

## Alterações

### PDF
- removida a caixa lateral com índice/categoria/data dentro de cada relatório
- cabeçalho agora usa toda a largura útil do bloco
- suporte a logo JPEG embutida no PDF
- quebra de palavras longas melhorada para reduzir sobreposição

### Modelo de relatório
- novo campo `headerLogoDataUrl`
- upload de imagem no cadastro do modelo
- imagem convertida no navegador para JPG antes de salvar
- pré-visualização da logo no editor e no preview da página

### Persistência
- `reportTemplatesStore` passa a aceitar `headerLogoDataUrl`

## Regras
- a logo é opcional
- quando presente, fica acima do cabeçalho textual
- a caixa lateral de metadados foi removida do preview e do PDF

## Validação
1. editar um modelo
2. carregar uma logo
3. salvar o modelo
4. gerar um PDF
5. confirmar:
   - logo visível no cabeçalho
   - sem caixa lateral no relatório
   - cabeçalho com mais espaço útil
