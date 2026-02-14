# Passo 28.2 — Auditoria no Admin (UI para `audit_logs`)

## Objetivo
Dar visibilidade operacional (sem “caixa‑preta”) das ações críticas do Admin já registradas em `audit_logs`.

Isso reforça responsabilidade e consistência do cuidado: decisões e ações ficam rastreáveis, evitando improviso e reduzindo erros repetidos.

## O que foi implementado

### 1) Nova aba no Admin: **Auditoria**
- Local: menu lateral do Admin (sidebar)
- Conteúdo: lista de eventos do `audit_logs` (somente leitura)

### 2) Filtros e busca (client-side)
- Período: **24h / 7 dias / 30 dias**
- Busca textual: procura em campos úteis (ação, admin, alvo, path, meta)
- Filtro por ação: dropdown gerado a partir das ações presentes no período carregado

### 3) Detalhes por evento
- Modal com:
  - Data/hora
  - Ação (humanizada)
  - Admin (email/uid)
  - Status
  - Request (method + path)
  - Target
  - Meta (sanitizada)

## Backend (endpoint seguro)

### `GET /api/admin/audit/list`
Segurança:
- `Authorization: Bearer <idToken>`
- `requireAdmin` (role=admin)
- `rateLimit` (best-effort)

Query params:
- `days`: 1 | 7 | 30 (default 7)
- `limit`: 20..300 (default 120)
- `cursorId`: doc id para paginação

Resposta:
- `items`: lista com campos principais e `meta`
- `nextCursorId`: para “Carregar mais”

## Observações
- O filtro por **ação** é aplicado no **front** (evita necessidade de índice composto no Firestore).
- Se futuramente quiser filtro por ação **server-side**, provavelmente será necessário criar **composite index** no Firestore.
