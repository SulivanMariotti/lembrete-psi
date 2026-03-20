# Admin / Análise — correção de acentuação na exportação CSV

## Objetivo
Corrigir a exportação CSV do módulo `/admin/analise` para que palavras com acentuação sejam abertas corretamente no Excel.

## Ajuste aplicado
- inclusão de **BOM UTF-8** (`\ufeff`) no início do conteúdo CSV gerado por `src/lib/adminAnalysisExport.js`

## Por que
O Excel costuma interpretar CSV UTF-8 sem BOM com encoding incorreto, o que gera caracteres quebrados em palavras acentuadas, como:
- `Convênio`
- `Especialidade`
- nomes de pacientes/profissionais com acento

## Impacto
- melhora a leitura do CSV no Excel
- não altera a estrutura do arquivo
- não muda as regras de negócio nem os dados exportados

## Como validar
1. abrir `/admin/analise`
2. rodar uma análise
3. exportar qualquer um dos CSVs
4. abrir no Excel
5. confirmar que palavras com acento aparecem corretamente

## Arquivos alterados
- `src/lib/adminAnalysisExport.js`
- `tests/admin-analysis/adminAnalysisExport.test.mjs`
