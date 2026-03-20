# 111_ADMIN_REPORT_IMPORT_HOTFIX_REQUIRED_HEADERS

## Objetivo
Corrigir o erro em `/admin/report` na aba Importação:

- `TypeError: Cannot read properties of undefined (reading 'join')`

## Causa
O componente `ReportImportFlowPanel.js` estava usando:

- `REPORT_IMPORT_TEMPLATE.requiredColumns.join(" • ")`

Mas o objeto real exportado por `src/lib/shared/reportImportTemplate.js` usa a propriedade:

- `requiredHeaders`

## Ajuste aplicado
Foi trocado o acesso para:

- `REPORT_IMPORT_TEMPLATE.requiredHeaders`

E o render ficou defensivo com `Array.isArray(...)` antes do `.join()`.

## Arquivo alterado
- `src/components/Admin/report-import/ReportImportFlowPanel.js`

## Validação
1. Abrir `/admin/report`
2. Ir na aba Importação
3. Confirmar que a tela renderiza sem o erro de `join`
4. Confirmar que o texto **Modelo esperado** aparece normalmente
