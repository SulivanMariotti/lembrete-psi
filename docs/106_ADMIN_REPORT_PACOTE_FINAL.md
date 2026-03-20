# 106_ADMIN_REPORT_PACOTE_FINAL

## Objetivo
Pacote final consolidado do módulo `/admin/report` para a mudança de regra de importação:
- Psicologia = `excel`
- Nutrição = `excel`
- Fonoaudiologia = `excel`

## Escopo incluído
### Entrega 1 — Obrigatório
- backend da regra
- API/configuração de especialidades
- UI mínima das abas Especialidades e Importação
- testes automatizados mínimos

### Entrega 2 — Consolidação
- comunicação global da página
- mensagem operacional do PDF
- documentação oficial
- documento “onde paramos” alinhado à nova regra

## Regra oficial consolidada
- Especialidades em modo `excel` usam a coluna `Demanda` da planilha
- Quando `Demanda` vier vazia, usam `Tags` como fallback
- `CID` e `Categoria` vêm da Demanda resolvida no sistema

## Arquivos incluídos
- `src/lib/server/reportImportRuleEngine.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/app/api/admin/report/specialties/route.js`
- `src/app/api/admin/report/specialties/[id]/route.js`
- `src/components/Admin/report-import/shared.js`
- `src/components/Admin/report-import/ReportSpecialtiesPanel.js`
- `src/components/Admin/report-import/ReportImportFlowPanel.js`
- `tests/report-admin/reportImportAnalysis.test.mjs`
- `src/components/Admin/AdminReportImportView.js`
- `src/app/admin/report/page.js`
- `src/app/api/admin/report/pdf/route.js`
- `docs/86_REPORT_IMPORT_RULES.md`
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
- `docs/docs/103_ADMIN_REPORT_ONDE_PARAMOS_NOVO_CHAT_ATUALIZADO.md`
- `docs/104_ADMIN_REPORT_ENTREGA_1_IMPLEMENTACAO.md`
- `docs/105_ADMIN_REPORT_ENTREGA_2_CONSOLIDACAO.md`

## Como validar
1. Aplicar os arquivos do pacote no repositório.
2. Rodar:
   - `node --test tests/report-admin/reportImportAnalysis.test.mjs`
3. Validar no `/admin/report`:
   - Nutrição e Fonoaudiologia em `excel`
   - preview com `excel-missing-demand`
   - preview com `excel-demand-not-found`
   - textos da UI alinhados à nova regra
4. Forçar falha de geração de PDF sem linhas prontas:
   - a mensagem deve orientar revisão de `Demanda` e fallback em `Tags`
5. Revisar os docs atualizados em `/docs`.

## Resultado esperado
- preview, resumo, UI, PDF, testes e docs alinhados à nova regra oficial
- nenhuma comunicação relevante presa à regra antiga
