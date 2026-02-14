# Atualização — 2026-02-14 — Passo 26 (Backup local sem custo)

## Objetivo

Criar um **backup local do Firestore** para o Lembrete Psi sem depender de Bucket (Cloud Storage) — útil para operação e segurança, principalmente antes de importações e mudanças estruturais.

## O que mudou

- ✅ Criado script de backup local: `scripts/backup-firestore.mjs`
- ✅ Adicionado comando: `npm run backup:local`
- ✅ `.gitignore` atualizado para ignorar `backups/` e `*.jsonl.gz` (evita commitar dados sensíveis)

## Como usar

Veja: `docs/48_PASSO_26_BACKUP_LOCAL_SEM_CUSTO.md`
