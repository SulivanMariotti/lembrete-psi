# ATUALIZAÇÃO — PASSO 28.2 — Aba Auditoria no Admin — 2026-02-14

## Objetivo
Visualizar `audit_logs` dentro do Admin com leitura rápida.

## Entrega
- Nova aba/menu “Auditoria”
- Filtros: 24h / 7 dias / 30 dias
- Busca + filtro por ação + paginação
- Endpoint seguro `GET /api/admin/audit/list`

## Hotfix
- Build corrigido: arquivo `AdminAuditTab` e rota `audit/list` adicionados (module not found).
