# HOTFIX 25.4.12 — Vercel/Turbopack build: duplicate identifier `auth`

## Sintoma
No deploy da Vercel (Next.js 16 + Turbopack), build falhava com:

- `the name 'auth' is defined multiple times`
- arquivo: `src/app/api/admin/patient/register/route.js`

## Causa
No handler `POST`, havia duas constantes no mesmo escopo com o mesmo nome:

1. `const auth = await requireAdmin(req);` (gatekeeper)
2. `const auth = admin.auth();` (Firebase Admin Auth)

O Turbopack identifica isso como erro de compilação.

## Correção aplicada
Renomeado o resultado do gatekeeper para `gate`:

- `const gate = await requireAdmin(req);`
- `if (!gate.ok) return gate.res;`

Mantido `const auth = admin.auth();` para o Firebase Admin Auth.

## Impacto
- Nenhuma mudança de comportamento em runtime.
- Apenas correção de compilação.
