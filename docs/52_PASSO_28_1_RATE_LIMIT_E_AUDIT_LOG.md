# PASSO 28.1 — Rate limit básico + Audit Log (rotas Admin)

**Objetivo**

Adicionar uma camada extra de proteção operacional nas rotas sensíveis do Admin, com:

1) **Rate limit best-effort** (in-memory) por IP + (uid quando disponível), evitando loops acidentais e abuso básico.
2) **Audit log** server-side para ações críticas, registrando o “quem fez o quê” com metadados mínimos.

> Observação: o rate limit **in-memory** funciona por instância do serverless. Em Vercel, pode haver mais de uma instância, então o bloqueio não é “global”. Mesmo assim, já ajuda muito contra *loops*, *double-click* e abuso simples.

---

## O que foi implementado

### 1) Helper: Rate limit
Arquivo: `src/lib/server/rateLimit.js`

- Chave do bucket: `bucket + ip + uid(opcional)`
- Resposta padrão:
  - Se exceder, retorna **HTTP 429** com headers `Retry-After`, `X-RateLimit-Limit` e `X-RateLimit-Remaining`.

### 2) Helper: Audit log
Arquivo: `src/lib/server/auditLog.js`

- Collection: **`audit_logs`**
- Campos gravados (mínimos):
  - `createdAt` (serverTimestamp)
  - `actorUid`, `actorEmail`
  - `action`, `status`, `target`
  - `ip`, `ua`, `method`, `path`
  - `meta` (sanitizado e truncado)

> Segurança: chaves sensíveis são ignoradas (ex.: `token`, `secret`, `password`) e strings grandes são truncadas.

---

## Rotas com rate limit aplicado

Todas as rotas em `src/app/api/admin/**` receberam rate limit.

Buckets e limites (ajuste inicial):
- `admin:patients:list` → 120/min
- `admin:attendance:summary` → 120/min
- `admin:push:status` → 120/min
- `admin:system:health` → 120/min
- `admin:push:status-batch` → 60/min
- `admin:push:register` → 60/min
- `admin:patient:*` (register/pair-code/delete) → 20–30/min
- `admin:attendance:import` → 10/5min
- `admin:attendance:send-followups` → 8/5min
- `admin:reminders:send` → 8/5min
- `admin:users:repair-roles` → 5/10min

Também aplicado em endpoints legados (ainda usados pelo Admin):
- `src/app/api/send/route.js` → `admin:send:legacy` (8/5min)
- `src/app/api/attendance/import/route.js` → `admin:attendance:import:legacy` (10/5min)

---

## Rotas com audit log aplicado (ações críticas)

- `POST /api/admin/patient/register` → `patient_register_upsert`
- `POST /api/admin/patient/delete` → `patient_deactivate` / `patient_deactivate_not_found`
- `POST /api/admin/patient/pair-code` → `patient_pair_code_issued` (não registra o código)
- `POST /api/admin/attendance/import` → `attendance_import_preview` / `attendance_import_commit`
- `POST /api/admin/attendance/send-followups` → `attendance_send_followups`
- `POST /api/admin/reminders/send` → `reminders_send`
- `POST /api/admin/users/repair-roles` → `users_repair_roles`
- `POST /api/admin/appointments/sync-summary` → `appointments_sync_summary`
- Legado: `POST /api/send` → `legacy_send_push`
- Legado: `POST /api/attendance/import` → `attendance_import_commit_legacy`

---

## Como validar (manual)

1) **Rate limit**
   - Repita a mesma ação rapidamente (ex.: clicar várias vezes em “Disparar lembretes”).
   - Se exceder, a API retorna **429**.

2) **Audit log**
   - Execute uma ação crítica (ex.: gerar *pair code*).
   - No Firebase Console → Firestore → coleção `audit_logs`:
     - Verifique `actorUid`, `action`, `path`, `createdAt`.

---

## Próximo passo sugerido (28.2)

Criar um **painel de auditoria** no Admin (somente leitura) para visualizar os últimos logs (últimas 24–72h), com filtro por `action` e `actorEmail`.
