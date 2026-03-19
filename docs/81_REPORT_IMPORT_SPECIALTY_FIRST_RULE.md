# Regra de importação por Especialidade no módulo de relatórios

## Objetivo
Trocar o motor da pré-análise para que a coluna **Especialidade** seja a primeira validação do lote.

## Regra implementada
1. Ler a coluna `Especialidade`.
2. Localizar a Especialidade na coleção `report_specialties`.
3. Aplicar o modo de origem da Demanda:
   - `excel` → Psicologia lê `Demanda` do arquivo e usa `Tags` como fallback compatível.
   - `system_default` → Nutrição/Fonoaudiologia ignoram Demanda do arquivo e usam a Demanda padrão cadastrada.
4. Resolver CID por idade e a categoria escolhida no lote.

## Status novos do preview
- `missing-specialty`
- `specialty-not-found`
- `inactive-specialty`
- `psychology-missing-demand`
- `psychology-demand-not-found`
- `specialty-without-default-demand`
- `inactive-demand`
- `missing-category`
- `ready`

## Impacto no botão Gerar PDF
O botão continua sendo habilitado quando existe pelo menos uma linha `ready`, mas agora `ready` depende da validação por Especialidade.

## Arquivos alterados
- `src/lib/shared/reportSpecialties.js`
- `src/lib/shared/reportImportTemplate.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/components/Admin/AdminReportImportView.js`
- `src/app/api/admin/report/pdf/route.js`

## Validação recomendada
- Psicologia sem Demanda no arquivo deve falhar.
- Nutrição/Fonoaudiologia com Demanda vazia no arquivo devem depender da Demanda padrão da Especialidade.
- Linha sem Especialidade deve ficar inconsistente e não entrar no PDF.
