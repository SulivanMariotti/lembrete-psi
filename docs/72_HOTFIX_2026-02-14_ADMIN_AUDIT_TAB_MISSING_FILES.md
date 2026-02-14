# HOTFIX — 2026-02-14 — Build: módulo `AdminAuditTab` não encontrado

## Sintoma
Build falhando: `Module not found: Can't resolve './AdminAuditTab'`.

## Causa
Import do componente adicionado no `AdminPanelView.js`, mas arquivo não incluído no patch.

## Correção
Adicionar:
- `src/components/Admin/AdminAuditTab.js`
- `src/app/api/admin/audit/list/route.js`
