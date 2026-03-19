# Report Import Hotfix (Pacote Cumulativo)

## Objetivo
Corrigir erro de build causado pela ausência do arquivo `src/lib/server/xlsxLite.js` quando o pacote de Demandas era aplicado sem o pacote anterior de importação base.

## Ajuste aplicado
- Pacote cumulativo contendo todos os arquivos necessários para o módulo `/admin/report`
- Inclusão do parser local de `.xlsx` em `src/lib/server/xlsxLite.js`

## Validação
- Conferir que o import `@/lib/server/xlsxLite` resolve corretamente
- Abrir `/admin/report`
- Importar a planilha base
- Validar cadastro de Demandas e escolha de categoria
