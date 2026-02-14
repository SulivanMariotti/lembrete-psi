# ATUALIZAÇÃO — PASSO 25 — Gate de produção: segurança mínima — 2026-02-14

## Bloqueadores encontrados
1) Rotas admin/sensíveis expostas ou “protegidas” por segredo público (`NEXT_PUBLIC_*`).
2) Risco de vazamento de segredos (ex.: `.env.local`) por ausência de `.gitignore`.

## Correções aplicadas (25.3)
- Padrão único: `Authorization: Bearer <idToken>` + `verifyIdToken` + claim admin.
- Helper server-side: `requireAuth` e `requireAdmin`.
- Proteção de rotas sensíveis: `/api/admin/**` + endpoints legados sensíveis.
- `.gitignore` adicionado para impedir commit de `.env*` e chaves.

## Vercel — variáveis necessárias (Production)
- `FIREBASE_ADMIN_SERVICE_ACCOUNT_B64`
- `ADMIN_UID`
- `ADMIN_PASSWORD`

## Hotfix relevante
- `patient/register` (route) corrigido por conflito de variável `auth` duplicada.

## Resultado
Produção liberada com segurança mínima (admin real via token, secrets server-only).
