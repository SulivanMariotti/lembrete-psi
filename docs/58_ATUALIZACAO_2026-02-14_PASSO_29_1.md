# Atualização — 2026-02-14 (Passo 29.1)

## O que mudou
- **Admin (rotas /api/admin/*):**
  - Bloqueio de requisições com `Origin` diferente do host (anti-CSRF).
  - Exceções agora retornam erro **genérico** (sem vazar detalhes) + `requestId`.
  - Exceções registram `audit_logs` com `status=error` e `reason` truncado.

- **Client Admin:**
  - `adminFetch()` agora possui **retry seguro** (somente GET/HEAD) em falhas transitórias.

## Motivação
Reduzir risco de:
- CSRF/abuso via chamadas cross-origin no contexto do navegador.
- Erros exibindo detalhes internos.
- Falhas sem trilha de auditoria.

## Documentação
- Ver detalhes em: `docs/57_PASSO_29_1_CORS_RETRY_FAILSAFE.md`
