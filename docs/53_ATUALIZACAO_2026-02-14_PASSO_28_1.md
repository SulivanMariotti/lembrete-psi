# Atualização — 2026-02-14 — PASSO 28.1 (Rate limit + Audit log)

## Objetivo
Adicionar proteção operacional nas rotas Admin:
- Rate limit (best-effort) por IP/uid
- Audit log server-side para ações críticas

## Arquivos adicionados
- `src/lib/server/rateLimit.js`
- `src/lib/server/auditLog.js`
- `docs/52_PASSO_28_1_RATE_LIMIT_E_AUDIT_LOG.md`
- `docs/53_ATUALIZACAO_2026-02-14_PASSO_28_1.md`

## Arquivos alterados (rate limit)
- `src/app/api/admin/appointments/sync-summary/route.js`
- `src/app/api/admin/attendance/import/route.js`
- `src/app/api/admin/attendance/send-followups/route.js`
- `src/app/api/admin/attendance/summary/route.js`
- `src/app/api/admin/patient/delete/route.js`
- `src/app/api/admin/patient/pair-code/route.js`
- `src/app/api/admin/patient/register/route.js`
- `src/app/api/admin/patients/list/route.js`
- `src/app/api/admin/push/register/route.js`
- `src/app/api/admin/push/status/route.js`
- `src/app/api/admin/push/status-batch/route.js`
- `src/app/api/admin/reminders/send/route.js`
- `src/app/api/admin/system/health/route.js`
- `src/app/api/admin/users/repair-roles/route.js`

## Arquivos alterados (endpoints legados)
- `src/app/api/send/route.js`
- `src/app/api/attendance/import/route.js`

## Notas
- O rate limit é **in-memory por instância** (Vercel). Ajuda contra loops e abuso simples.
- O audit log grava eventos em `audit_logs` com meta truncado/sanitizado.
