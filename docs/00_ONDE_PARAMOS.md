# Lembrete Psi — Onde paramos

Data: 2026-02-11

## Missão (produto)
Sustentar o vínculo terapêutico e reduzir faltas pela **constância**:
- lembretes automáticos (48h, 24h, manhã)
- psicoeducação no painel do paciente
- responsabilização (contrato, constância, histórico/auditoria)
- UX deliberada (sem “cancelar sessão” fácil; sessão como contrato)

---

## Estado atual (confirmado)

### ✅ Contrato Terapêutico
- Admin define em `config/global`:
  - `contractText` (string)
  - `contractVersion` (number)
- Paciente lê e aceita; grava em `users/{uid}`:
  - `contractAcceptedVersion` (number)
  - `contractAcceptedAt` (timestamp)
- Admin → Pacientes mostra **Contrato: Aceito/Pendente** separado de **Cadastro: Ativo/Inativo**.

### ✅ Push / Notificações (sem permission-denied)
- Painel do paciente **não lê** `subscribers/{phoneCanonical}` direto do Firestore.
- O paciente usa apenas rotas server-side:
  - `GET /api/patient/push/status`
  - `POST /api/patient/push/register`
- Recuperação de telefone quando ausente:
  - `GET /api/patient/resolve-phone` (resolve por email e persiste no `users/{uid}` quando possível)

### ✅ Histórico (Admin)
- Leitura robusta com fallback entre `createdAt` e `sentAt` (legado):
  - `sentAt ← sentAt || createdAt || payload.sentAt || payload.createdAt`
  - `createdAt ← createdAt || sentAt || payload.createdAt || payload.sentAt`
- Tipos exibidos com **rótulos amigáveis** (PT-BR) e `type` técnico no hover.

### ✅ Admin → Pacientes (layout)
- “flags/pílulas” para:
  - Notificações (ativas/ausentes)
  - Cadastro (ativo/inativo)
  - Contrato (aceito/pendente)

### ✅ Login do paciente (novo): Código de Vinculação (Opção B)
- Objetivo: **simples, robusto e sem custo** (sem email/SMS).
- Admin gera **Código de Vinculação** (formato `XXXX-XXXX-XXXX`) para o paciente parear o aparelho.
- O código **não é salvo em texto puro**: salva `hash + salt`.
- Paciente entra com **Telefone + Código** e recebe sessão (via Firebase Auth custom token).
- Código é **single-use** (após parear, status vira `used`).
- Admin → Pacientes mostra coluna **Código** (Sem/Ativo/Usado/Revogado + last4).
- Teste realizado: **A + B + C ok** (gerar, vincular, bloquear reuse).

---

## Pendências (prioridade alta)
1) **Admin → Presença/Faltas**: estabilizar preview/amostra + fluxo “Limpar” + reprocessar.
2) Deduplicação/consistência de `users` (email/phoneCanonical) para evitar doc sem telefone.
3) **Futuro**: reintroduzir autenticação alternativa (magic link/OTP) antes de PWA/App.

## Próximo passo sugerido (1 por vez)
**Próximo passo (1/1):** corrigir Admin → Presença/Faltas:
- preview “Amostra” preencher `sample`
- “Limpar” não deixar estado preso
- reprocessar upload sem trocar de menu
- garantir visibilidade “Disparos por constância”
