# PASSO 27 — Painel de Saúde do Sistema (Admin)

Objetivo: adicionar uma visão rápida no **Dashboard Admin** para indicar se o sistema está "vivo" e operando bem, sem expor dados sensíveis.

## O que foi implementado

### 1) Sinal de vida do Backup (sem custo)
- O script `npm run backup:local` (PASSO 26) agora, ao finalizar, grava **apenas metadados** em:
  - `system/health` (Firestore)
  - Campo `lastBackup`

**Importante:** não grava caminhos locais do computador (privacidade). Apenas:
- data/hora do backup
- total de documentos
- total de coleções exportadas e quantas falharam
- modo: `local`

### 2) Endpoint seguro para o Admin
- Criado `GET /api/admin/system/health`
- Proteção:
  - `Authorization: Bearer <idToken>`
  - claim `role=admin` (ou fallback `users/{uid}.role=admin`)

### 3) Card no Dashboard Admin
- Novo bloco "Saúde do Sistema" no topo do dashboard com:
  - **Último backup** (timestamp + status)
  - **Risco (2+ faltas)** (contagem)
  - **Falhas de lembretes (24h)** (proxy de erros operacionais)
  - **Importações recentes** (presença/faltas e agenda, via histórico)

## Como usar

### Atualizar status do backup
1. No seu PC (pasta do projeto):
   - `npm run backup:local`
2. Ao concluir, o dashboard Admin passa a mostrar o "Último backup" automaticamente.

Recomendação operacional: rodar 1x/semana.

## Arquivos alterados
- `scripts/backup-firestore.mjs`
- `src/app/api/admin/system/health/route.js`
- `src/components/Admin/AdminDashboardTab.js`
- `src/components/Admin/AdminPanelView.js`

