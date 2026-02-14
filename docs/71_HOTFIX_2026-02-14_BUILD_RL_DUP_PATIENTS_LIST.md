# HOTFIX — 2026-02-14 — Vercel build: variável `rl` duplicada (patients/list)

## Sintoma
Build falhando com `the name rl is defined multiple times`.

## Causa
Bloco de rate limit inserido 2x no mesmo escopo.

## Correção
Manter apenas 1 declaração `const rl = await rateLimit(...)`.
