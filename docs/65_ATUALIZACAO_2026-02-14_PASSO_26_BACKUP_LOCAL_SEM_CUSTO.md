# ATUALIZAÇÃO — PASSO 26 — Backup local sem custo — 2026-02-14

## Objetivo
Criar rotina de backup sem depender de Cloud Storage (pago).

## Entrega
- Script Node: `backup:local` gerando dumps compactados em `./backups/`.
- `backups/` ignorado no git.
- Documentação de rotina (semanal, manter 8 semanas).

## Rotina recomendada
- 1x/semana (sexta): `npm run backup:local`
- Copiar pasta `backups/` para Drive/OneDrive (restrito)
- Manter 8 semanas e remover as mais antigas.
