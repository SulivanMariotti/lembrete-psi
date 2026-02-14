# PASSO 25.3 — Segurança das rotas Admin (produção)

## O que este passo faz

1. **Remove** qualquer proteção baseada em `x-admin-secret` / `NEXT_PUBLIC_*` (segredo exposto no client).
2. **Padroniza** as rotas sensíveis para exigir:
   - `Authorization: Bearer <Firebase idToken>`
   - **role admin** (claim `role=admin` ou fallback `users/{uid}.role=admin`).
3. **Bloqueia** endpoints sensíveis que estavam abertos (ex.: `/api/send`).
4. **Unifica** inicialização do Firebase Admin para usar **apenas**:
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT` (JSON) **ou** `FIREBASE_ADMIN_SERVICE_ACCOUNT_B64`.

## Mudanças principais

### Backend

- Adicionado:
  - `src/lib/server/requireAuth.js`
  - `src/lib/server/requireAdmin.js`

- Rotas **Admin** agora exigem token Bearer:
  - `/api/admin/*` (todas)

- Endpoints sensíveis protegidos:
  - `/api/send` (legado)
  - `/api/attendance/import` (legado)

- Rotas de status/confirm que estavam **sem auth** agora exigem Bearer:
  - `/api/attendance/confirmed`
  - `/api/attendance/confirmd` (legado/typo)

### Frontend (Admin)

- Adicionado wrapper:
  - `src/services/adminApi.js` → injeta `Authorization: Bearer <idToken>`.

- Atualizado:
  - `AdminPanelView`, `AdminScheduleTab`, `AdminPatientsTab`, `AdminAttendanceFollowupsCard`
  - Removidas dependências de `NEXT_PUBLIC_ADMIN_PANEL_SECRET`.

### Repo

- Adicionado `.gitignore` para evitar commit de `.env*` e chaves.

## Variáveis de ambiente (Vercel)

### Obrigatórias

- `FIREBASE_ADMIN_SERVICE_ACCOUNT_B64`
  - Base64 do JSON do service account (recomendado)
  - OU usar `FIREBASE_ADMIN_SERVICE_ACCOUNT` (JSON puro)

- `ADMIN_PASSWORD`
  - Senha do Admin (usada em `/api/auth`)

- `ADMIN_UID`
  - UID do usuário Admin (Firebase Auth) que receberá o customToken

### Públicas (já existentes no projeto)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Produção — atenção

- **Garanta** `NEXT_PUBLIC_DEV_LOGIN=false` em produção.
  - Esse flag liga utilitários de dev no painel.

## Checklist de produção (rápido)

1. ✅ Rotas Admin sem `x-admin-secret`.
2. ✅ Admin calls no client usando `Authorization` via `adminFetch`.
3. ✅ `FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64)` configurado na Vercel.
4. ✅ `ADMIN_PASSWORD` e `ADMIN_UID` configurados.
5. ✅ `NEXT_PUBLIC_DEV_LOGIN=false`.
6. ✅ Regras do Firestore: painel do paciente sem `permission-denied`.
