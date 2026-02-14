# Hotfix — Passo 28.2 (Auditoria no Admin)

## Contexto
O deploy falhou com:

```
Module not found: Can't resolve './AdminAuditTab'
./src/components/Admin/AdminPanelView.js
```

## Causa
O patch do **Passo 28.2** havia adicionado o import e o botão **Auditoria** no menu, mas não incluiu:

- `src/components/Admin/AdminAuditTab.js`
- `src/app/api/admin/audit/list/route.js`

## Correção aplicada
Este hotfix adiciona os 2 arquivos faltantes:

1) **UI**: `AdminAuditTab` (tabela + filtros 24h/7/30 + busca + modal de detalhes)
2) **API**: `GET /api/admin/audit/list` (segura com `requireAdmin` + `rateLimit`), buscando da coleção `audit_logs`

## Como validar
1) Deploy deve passar sem erro.
2) Acesse `/admin` → clique em **Auditoria**.
3) Verifique se aparecem registros e se o modal **Ver** abre detalhes.
