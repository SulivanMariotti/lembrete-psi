# Lembrete Psi — Onde paramos

Data: 2026-02-12

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

---

## Presença/Faltas (planilha) — Atualizações concluídas

### ✅ Importação por CSV (Admin)
Fluxo no Admin → **Presença/Faltas**:
1) **Selecionar arquivo** (upload CSV)
2) **Verificar (validação / dryRun)** → mostra resumo, amostras e inconsistências
3) **Importar** → grava no Firestore
4) **Limpar** → zera estado e permite novo upload/validação

#### Layout esperado da planilha (CSV)
Cabeçalho:
`ID, NOME, DATA, HORA, PROFISSIONAL, SERVIÇOS, LOCAL, STATUS`

- Aceita `SERVIÇOS` com/sem acento e separador `,` ou `;`
- `DATA`: `dd/mm/aaaa` ou `yyyy-mm-dd`
- `HORA`: `HH:MM`
- `STATUS`: opcional (se vazio ou desconhecido, aplica **Status padrão** escolhido no Admin)

#### API (server-side, Admin SDK)
`POST /api/admin/attendance/import`
Body:
- `csvText` (obrigatório)
- `source` (opcional)
- `defaultStatus` (opcional)
- `dryRun` (opcional; quando true não grava, só valida e retorna preview)

Grava em `attendance_logs` com chave composta:
`{patientId}_{isoDate}_{HHMM}_{profissionalSlug}`

Campos principais:
- `patientId`
- `phoneCanonical` (pode ser `null`)
- `hasPhone` (boolean)
- `name`, `isoDate`, `time`, `profissional`, `service`, `location`, `status`, `source`
- `createdAt`, `updatedAt`

#### Validação: Erros x Avisos
- **Erros**: bloqueiam a linha (ex.: ID vazio, DATA/HORA inválidas, duplicada no arquivo)
- **Avisos**: não bloqueiam (ex.: NOME vazio, STATUS não reconhecido, **sem phoneCanonical**)

Inclui botão:
- **Baixar inconsistências (CSV)** (erros + avisos, com `field`, `message`, `rawLine`, etc.)

#### UX do upload
- O upload virou **botão** (“Selecionar arquivo”), sem o controle padrão “Escolher arquivo / Nenhum arquivo escolhido”.
- Exibe o **nome do arquivo** ao lado.

---

## Disparos por Constância — Atualizações concluídas

### ✅ Preview “Amostra” não fica mais vazio
`POST /api/admin/attendance/send-followups`
- `dryRun` retorna `sample` mesmo quando a linha está bloqueada (para validar placeholders/mensagens).
- Se o log não tiver telefone, tenta resolver por `patientId` em `users` via:
  - `patientExternalId` (preferido) ou `patientId` (legado)
- Contabiliza bloqueios com transparência:
  - `blockedNoPhone`, `blockedNoToken`, `blockedInactive...`
- `sample[]` inclui:
  - `canSend` + `blockedReason` (`no_phone`, `no_token`, `inactive_patient`, `inactive_subscriber`)

---

## Melhorias operacionais concluídas

### ✅ Recarregar dados após import (sem trocar de menu)
- Após importar, o Admin força refresh interno para atualizar o painel/estatísticas de constância imediatamente.

---

## Pendências (prioridade alta)
1) **Exportar preview normalizado completo (CSV)** (não só inconsistências), para auditoria antes de importar.
2) **Painel de Constância (Paciente)** alimentado por `attendance_logs`:
   - reforço de presença (“parabéns pela consistência”)
   - psicoeducação em caso de falta (sem moralismo; foco em vínculo/continuidade)
3) Ferramenta de “higiene de cadastro”:
   - consolidar `patientExternalId`, `phoneCanonical` e evitar duplicidades em `users`.

## Próximo passo sugerido (1 por vez)
**Próximo passo (1/1):** adicionar botão “Baixar preview normalizado (CSV)” no fluxo de validação (dryRun).
