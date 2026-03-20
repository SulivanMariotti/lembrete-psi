# 105_ADMIN_REPORT_ENTREGA_2_CONSOLIDACAO

## Objetivo
Registrar a consolidação pós-obrigatória da mudança de regra do módulo `/admin/report`, alinhando comunicação global, mensagem operacional do PDF e documentação oficial.

## Escopo alterado
- `src/components/Admin/AdminReportImportView.js`
- `src/app/admin/report/page.js`
- `src/app/api/admin/report/pdf/route.js`
- `docs/86_REPORT_IMPORT_RULES.md`
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
- `docs/docs/103_ADMIN_REPORT_ONDE_PARAMOS_NOVO_CHAT_ATUALIZADO.md`

## Regra oficial consolidada
- Psicologia = `excel`
- Nutrição = `excel`
- Fonoaudiologia = `excel`
- `Demanda` é a fonte prioritária da planilha
- `Tags` é fallback quando `Demanda` vier vazia
- `CID` e `Categoria` vêm sempre da Demanda resolvida no sistema

## Ajustes realizados
1. UI global do `/admin/report` atualizada para não comunicar mais a regra antiga.
2. Mensagem de erro da rota de PDF atualizada para orientar revisão de `Demanda`/`Tags` em especialidades `excel`.
3. Documentação oficial e checklist de homologação atualizados para a nova matriz de especialidades.
4. Arquivo “onde paramos” atualizado para o próximo chat já nascer com a regra nova consolidada.

## Como validar
- Abrir `/admin/report` e confirmar que o texto global fala de `Demanda` + fallback em `Tags`.
- Forçar geração de PDF sem linhas prontas e confirmar a nova orientação de erro.
- Ler `docs/86_REPORT_IMPORT_RULES.md` e confirmar as três especialidades em `excel`.
- Ler `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md` e confirmar cenários de Nutrição/Fono por `Demanda` e `Tags`.
- Ler `docs/docs/103_ADMIN_REPORT_ONDE_PARAMOS_NOVO_CHAT_ATUALIZADO.md` e confirmar ausência de `SYSTEM_DEFAULT` como regra principal de Nutrição/Fonoaudiologia.
