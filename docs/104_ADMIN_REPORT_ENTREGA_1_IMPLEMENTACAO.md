# 104_ADMIN_REPORT_ENTREGA_1_IMPLEMENTACAO.md

## Objetivo
Implementar a Entrega 1 do `/admin/report` para que Psicologia, Nutrição e Fonoaudiologia operem em modo `excel`, usando `Demanda` da planilha com fallback em `Tags`.

## Arquivos alterados
- `src/lib/server/reportImportRuleEngine.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/app/api/admin/report/specialties/route.js`
- `src/app/api/admin/report/specialties/[id]/route.js`
- `src/components/Admin/report-import/shared.js`
- `src/components/Admin/report-import/ReportSpecialtiesPanel.js`
- `src/components/Admin/report-import/ReportImportFlowPanel.js`
- `tests/report-admin/reportImportAnalysis.test.mjs`

## Resumo das mudanças
- Generalização dos status do preview:
  - `psychology-missing-demand` -> `excel-missing-demand`
  - `psychology-demand-not-found` -> `excel-demand-not-found`
- Generalização do summary:
  - `psychologyMissingDemand` -> `excelMissingDemand`
  - `psychologyDemandNotFound` -> `excelDemandNotFound`
- Blindagem das rotas de especialidades para limpar `defaultDemandId` quando o modo final não for `system_default`.
- Atualização dos textos mínimos da UI nas abas Especialidades e Importação.
- Reescrita da suíte mínima do import para cobrir Psicologia, Nutrição e Fonoaudiologia em `excel`.

## Como validar
1. Colocar Nutrição e Fonoaudiologia em modo `excel`.
2. Importar uma planilha com:
   - Nutrição por `Demanda`
   - Nutrição por `Tags`
   - Fonoaudiologia por `Demanda`
   - Fonoaudiologia por `Tags`
   - uma linha sem `Demanda/Tags`
   - uma linha com Demanda inexistente
3. Conferir o preview:
   - `excel-missing-demand`
   - `excel-demand-not-found`
   - ausência de textos presos à Psicologia
4. Rodar `node --test tests/report-admin/reportImportAnalysis.test.mjs`.
