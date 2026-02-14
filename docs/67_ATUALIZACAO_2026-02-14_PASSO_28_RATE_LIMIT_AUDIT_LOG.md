# ATUALIZAÇÃO — PASSO 28 — Rate limit + Audit log — 2026-02-14

## Objetivo
Conter abusos/loops e manter rastreabilidade de ações críticas.

## Entrega
- Rate limit best-effort (memória) em rotas admin e endpoints sensíveis.
- `audit_logs` no Firestore para ações críticas (ok/error).

## Hotfix
- `patients/list` corrigido por duplicidade de variável `rl` (build).
