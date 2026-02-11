# Firebase / Firestore — Schema (snapshot)

> **Sem dados sensíveis.** Apenas estrutura: coleções, `docId`, campos e tipos.  
> Objetivo: documentar a “fonte de verdade” e as coleções operacionais do **Lembrete Psi**.

---

## Visão geral (regras de uso)

- **users/{uid}** é a fonte de verdade do paciente (role/status e identidade).
- **subscribers/{phoneCanonical}** guarda o **pushToken** (Web Push) do paciente.
- **config/global** centraliza as configurações de contrato, WhatsApp e templates.
- **history/** é **auditoria** com schema flexível.
  - Hoje coexistem logs **novos** (com `type`/`createdAt`) e logs **legados** (ex.: `sentAt`/`summary` sem `type`).
  - Padrão recomendado (alvo): `type`, `createdAt`, `payload` (ver `docs/11_HISTORY_LOGGING_STANDARD.md`).
- Recomendação de consistência: sempre que possível, gravar `phoneCanonical` e manter `users.phoneCanonical` sincronizado com o padrão usado em `subscribers` e `appointments`.

---

## Coleções e documentos

## 1) users/{uid}

**DocId**
- `uid` (string)

**Campos estáveis**
- `role` (string) — ex.: `"admin" | "patient"`
- `status` (string) — ex.: `"active" | "inactive"`
- `name` (string)
- `email` (string)
- `phone` (string) — pode conter o telefone “como chegou”
- `phoneNumber` (string, opcional) — telefone “limpo” (legado/compat)
- `phoneCanonical` (string) — **chave canônica** usada no sistema (ex.: `5511999999999`)
- `patientExternalId` (string, opcional) — id externo/legado (quando existir)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `deletedAt` (timestamp, opcional) — usado ao desativar
- `inactiveReason` (string, opcional)

**Observação**
- Quando `status = "inactive"`, endpoints server-side bloqueiam envios (agenda + presença/falta).

---

## 2) subscribers/{phoneCanonical}

**DocId**
- `phoneCanonical` (string)

**Campos**
- `pushToken` (string, opcional) — token do Web Push no navegador
- `token` (string, opcional) — legado/compat
- `email` (string, opcional)
- `isActive` (boolean, opcional)
- `lastSeen` (timestamp, opcional)
- `createdAt` (timestamp, opcional)
- `updatedAt` (timestamp, opcional)

**Observação**
- A existência do doc não garante envio: é necessário `pushToken` válido e paciente ativo (ver `users/{uid}`).

---

## 3) appointments/{appointmentId}

**DocId**
- `appointmentId` (string) — derivado de dados do agendamento (padrão interno do import/sync)

**Campos**
- `patientUid` (string, opcional) — quando vinculado ao `users/{uid}`
- `patientExternalId` (string, opcional)
- `phone` (string)
- `phoneCanonical` (string, opcional)
- `name` (string, opcional)
- `email` (string, opcional)

- `isoDate` (string) — formato `YYYY-MM-DD`
- `time` (string) — formato `HH:mm`

- `professional` **ou** `profissional` (string) — compatibilidade (padronizar ao longo do tempo)
- `service` (string)
- `location` (string)

- `status` (string) — ex.: `"scheduled" | "cancelled" | ..."`
- `cancelReason` (string, opcional)
- `cancelledAt` (timestamp, opcional)

- `source` (string, opcional) — ex.: `"admin_sync"`
- `sourceUploadId` (string, opcional)

- `createdAt` (timestamp, opcional)
- `updatedAt` (timestamp)

**Observação (Sync)**
- “Sincronizar” mantém histórico e cancela futuros removidos do upload (não apaga passado).

---

## 4) attendance_logs/{logId}

**DocId**
- `logId` (string) — gerado no import (pode ser autoId)

**Campos**
- `patientId` (string, opcional) — uid/externalId (quando existir)
- `patientExternalId` (string, opcional)

- `name` (string, opcional)
- `phone` (string)
- `phoneCanonical` (string, opcional)

- `isoDate` (string) — `YYYY-MM-DD`
- `time` (string) — `HH:mm`
- `profissional` (string, opcional)
- `service` (string, opcional)
- `location` (string, opcional)

- `status` (string) — `"present" | "absent"`

- `createdAt` (timestamp)
- `updatedAt` (timestamp, opcional)

---

## 5) patient_notes/{noteId}

**DocId**
- `noteId` (string) — geralmente `autoId`

**Campos**
- `patientId` (string) — uid do paciente
- `phone` (string, opcional)
- `content` (string)
- `createdAt` (timestamp)

---

## 6) config/{docId} (principal: global)

### config/global

**DocId**
- `global` (string)

**Campos (principais)**
- `whatsapp` (string)
- `contractText` (string)
- `contractVersion` (number)
- `updatedAt` (timestamp)

**Mensagens de lembrete (agenda)**
- `msg1` (string)
- `msg2` (string)
- `msg3` (string)
- `msg48h` (string, opcional)
- `msg24h` (string, opcional)
- `msg12h` (string, opcional)
- `reminderOffsetsHours` (array<number>) — ex.: `[48, 24, 12]`

**Presença/Falta (templates editáveis no Admin)**
- `attendanceFollowupPresentTitle` (string)
- `attendanceFollowupPresentBody` (string)
- `attendanceFollowupAbsentTitle` (string)
- `attendanceFollowupAbsentBody` (string)

**Placeholders suportados nos templates**
- `{nome}`
- `{data}` (DD/MM/AAAA)
- `{dataIso}`
- `{hora}`
- `{profissional}`
- `{servico}`
- `{local}`
- `{id}`
- Compatível com legado: `{{nome}}`

---

## 7) history/{id} (auditoria — schema flexível)

Coleção de logs/eventos do sistema (**não é** fonte de verdade de domínio).

### Por que existem documentos com campos diferentes?

O Firestore é **NoSQL**: uma coleção pode ter documentos com campos diferentes. A coleção `history` é propositalmente um **log de eventos**: cada evento registra um “recorte” do que aconteceu (envio, import, bloqueio, etc.).

Além disso, o projeto está em migração: há **mais de um padrão** de documento gravado em `history`.

**DocId**
- `id` (string) — `autoId`

### Padrões existentes hoje (snapshot do código)

#### Padrão A — `type` + `createdAt` + campos no nível raiz (mais comum hoje)

> Observação: apesar do padrão recomendado usar `payload`, **os endpoints atuais ainda gravam a maior parte dos dados no nível raiz**.

Tipos observados e seus campos típicos:

- `appointments_sync_summary` (POST `/api/admin/appointments/sync-summary`)
  - `uploadId`, `totalAppointments`, `uniquePatients`, `dateRange{firstISO,lastISO}`, `fallbackServiceCount`, `createdAt`

- `attendance_import_summary` (POST `/api/admin/attendance/import` e `/api/attendance/import`)
  - `count`, `skipped`, `source`, `sampleErrors[]`, `createdAt`

- `patient_register` (POST `/api/admin/patient/register`)
  - `uid`, `phoneCanonical`, `email`, `patientExternalId`, `createdAt`

- `patient_deactivate_not_found` (POST `/api/admin/patient/delete` quando não encontra)
  - `uid`, `email`, `phoneCanonical`, `patientExternalId`, `reason`, `createdAt`

- `patient_deactivate` (POST `/api/admin/patient/delete` quando encontra)
  - `userDocIds[]`, `uid`, `email`, `phoneCanonical`, `patientExternalId`, `reason`, `createdAt`

- `push_enabled` (POST `/api/patient/push/register` e `/api/admin/push/register`)
  - `patientId`, `phone` **ou** `phoneCanonical`, `tokenHash`, `tokenTail`, `userAgent`, `createdAt`

- `push_reminder_sent` (POST `/api/admin/reminders/send`)
  - `uploadId`, `phoneCanonical`, `appointmentIds[]`, `reminderTypes[]`, `createdAt`

- `push_reminder_failed` (POST `/api/admin/reminders/send`)
  - `uploadId`, `phoneCanonical`, `error`, `appointmentIds[]`, `createdAt`

- `push_reminder_send_summary` (POST `/api/admin/reminders/send`)
  - `uploadId`, `phonesTotal`, `messagesTotal`, `sentCount`, `failCount`,
    `skippedInactive`, `skippedInactivePatient`, `blockedInactive`, `blockedInactiveSubscriber`,
    `skippedNoToken`, `blockedNoToken`, `createdAt`

#### Padrão B — legado com `action`/`scope` + `createdAt`

- Ex.: `/api/admin/users/repair-roles` grava:
  - `action: "repair_roles"`, `scope: "users"`, `scanned`, `updated`, `skipped`, `createdAt`

#### Padrão C — legado antigo do endpoint `/api/send` (sem `type`, usa `sentAt`)

- Campos típicos:
  - `sentAt`, `count`, `skipped{noPhone,noMessage,noToken}`, `types[]`, `summary`, `errors[]`

### Padrão recomendado (alvo)

- `type` (string)
- `createdAt` (timestamp)
- `payload` (map)

Referência: `docs/11_HISTORY_LOGGING_STANDARD.md`.

### Nota importante para o Admin UI (estado atual)

- O Admin hoje ordena `history` por **`sentAt`** (`src/hooks/useData.js`), então logs do **Padrão A** (que usam `createdAt`) podem não aparecer no painel de Histórico.
- Ao padronizar, a query deve considerar `createdAt` e/ou fallback em `sentAt`.

### Exemplos reais (forma, sem conteúdo sensível)

**Exemplo (Padrão A) — `push_reminder_send_summary`**
```json
{
  "type": "push_reminder_send_summary",
  "uploadId": "upl_...",
  "phonesTotal": 10,
  "messagesTotal": 10,
  "sentCount": 7,
  "failCount": 3,
  "blockedNoToken": 2,
  "blockedInactive": 1,
  "createdAt": "serverTimestamp"
}
```

**Exemplo (Padrão B) — `repair_roles`**
```json
{
  "action": "repair_roles",
  "scope": "users",
  "scanned": 120,
  "updated": 6,
  "skipped": 114,
  "createdAt": "serverTimestamp"
}
```

**Exemplo (Padrão C) — log antigo do `/api/send`**
```json
{
  "sentAt": "serverTimestamp",
  "count": 12,
  "skipped": { "noPhone": 0, "noMessage": 1, "noToken": 3 },
  "types": ["msg48h", "msg24h"],
  "summary": "Envio push: 12 enviados | sem tel: 0 | sem msg: 1 | sem token: 3"
}
```

---
