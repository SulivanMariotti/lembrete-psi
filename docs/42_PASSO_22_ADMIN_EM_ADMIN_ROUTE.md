# Passo 22 — Admin em rota dedicada (/admin)

## Objetivo
Remover o acesso Admin da tela principal (`/`) para:
- manter o painel do paciente **exclusivo** para lembretes e constância terapêutica;
- reduzir ruído/atalhos no contexto clínico;
- separar claramente área pública (paciente) e área restrita (admin).

## Resultado esperado
- `/` (root) → **somente paciente** (login + painel)
- `/admin` → **somente admin** (login com senha → custom token → AdminPanel)

## Decisões técnicas
1) **Rota dedicada no App Router**
- Criar `src/app/admin/page.js` como página client-side.
- Criar `src/app/admin/layout.js` para aplicar `skin-admin` automaticamente.

2) **Gate de autenticação admin**
- Continua usando `POST /api/auth` para validar senha e emitir **Firebase Custom Token** com claim `{ role: "admin" }`.
- No client (`/admin`), após `signInWithCustomToken`, validar claims via `getIdTokenResult(..., true)`.
- Se houver usuário logado sem claim admin (ex.: paciente), mostrar aviso e exigir logout antes de entrar como admin.

3) **Segurança e Firestore Rules**
- Mantém padrão existente: coleções sensíveis (subscribers/history/appointments) só devem ser carregadas quando `isAdmin === true`.
- `/admin` usa `useData(isAdmin)` para evitar `permission-denied` antes do login.

4) **UX do paciente (clínico)**
- Remover botão/CTA “Admin” do:
  - login do paciente
  - header/menu do paciente
- Acesso admin passa a ser **por URL**: `/admin`.

## Arquivos envolvidos
- `src/app/page.js` (root: paciente-only)
- `src/app/admin/page.js` (novo)
- `src/app/admin/layout.js` (novo)
- `src/components/Patient/PatientLogin.js` (remover CTA admin)
- `src/features/patient/components/PatientHeader.js` (remover item Admin)
- `src/components/Patient/PatientFlow.js` (remover prop/repasse de onAdminAccess)

