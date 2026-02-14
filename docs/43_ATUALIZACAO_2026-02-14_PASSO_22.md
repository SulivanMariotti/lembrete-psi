# Atualização — 2026-02-14 — Passo 22 (Admin em /admin)

## O que foi feito

### 1) Separação de rotas
- **`/`** agora é **somente paciente** (login + painel do paciente).
- **`/admin`** é **somente admin** (senha → `/api/auth` → `signInWithCustomToken` → AdminPanel).

### 2) Remoção do acesso Admin do Paciente
- Removido CTA “Acesso Admin” do login do paciente.
- Removido item “Admin” do menu/header do paciente (desktop e mobile).

### 3) Gate de segurança no /admin
- Validação de claims via `getIdTokenResult(..., true)`.
- Se usuário estiver logado sem permissão admin (ex.: paciente), o `/admin` exige logout antes de prosseguir.
- `useData(isAdmin)` garante que coleções sensíveis só são carregadas após autenticação admin.

## Como acessar
- Paciente: `https://SEU_DOMINIO/`
- Admin: `https://SEU_DOMINIO/admin`

## Arquivos alterados / adicionados
- **Alterados**
  - `src/app/page.js`
  - `src/components/Patient/PatientLogin.js`
  - `src/features/patient/components/PatientHeader.js`
  - `src/components/Patient/PatientFlow.js`
  - `docs/37_FILES_ALTERADOS_2026-02-14.md`
  - `docs/39_PROMPT_NOVO_CHAT_2026-02-14.md`
- **Novos**
  - `src/app/admin/page.js`
  - `src/app/admin/layout.js`
  - `docs/42_PASSO_22_ADMIN_EM_ADMIN_ROUTE.md`
  - `docs/43_ATUALIZACAO_2026-02-14_PASSO_22.md`

