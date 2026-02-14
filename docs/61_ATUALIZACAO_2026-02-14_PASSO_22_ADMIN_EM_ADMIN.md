# ATUALIZAÇÃO — PASSO 22 — Admin em `/admin` — 2026-02-14

## Objetivo
Remover acesso Admin da tela principal (rota `/`) e isolar Admin em `/admin`.

## Mudanças
- Rota `/` ficou **somente paciente**.
- Rota `/admin` ficou **somente admin** (senha → `/api/auth` → custom token → AdminPanel).
- Removidos CTAs/links de Admin do fluxo do paciente (login e header/menu).

## Resultado
Preserva setting terapêutico no painel do paciente e reduz risco de confusão/atalhos indevidos.
