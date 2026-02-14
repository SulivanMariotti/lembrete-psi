# HOTFIX — 2026-02-14 — Vercel build: variável `auth` duplicada (patient/register)

## Sintoma
Build falhando (Turbopack) com mensagem: `the name auth is defined multiple times`.

## Causa
Conflito entre:
- `auth` do gatekeeper (requireAdmin/requireAuth)
- `auth` do Firebase Admin SDK (`admin.auth()`)

## Correção
Renomear o gatekeeper para `gate` e manter `auth` apenas para `admin.auth()`.
