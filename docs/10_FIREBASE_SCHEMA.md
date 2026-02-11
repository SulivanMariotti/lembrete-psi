# Firebase / Firestore — Schema (snapshot)

> **Sem dados sensíveis.** Apenas estrutura: coleções, `docId`, campos e tipos.  
> Objetivo: documentar a “fonte de verdade” e as coleções operacionais do **Lembrete Psi**.

---

## Visão geral (regras de uso)

- **users/{uid}** é a fonte de verdade do paciente (role/status e identidade).
- **subscribers/{phoneCanonical}** guarda o **pushToken** (Web Push) do paciente.
- **config/global** centraliza as configurações de contrato, WhatsApp e templates.
- **history/** é **auditoria** com schema flexível: cada evento define seu `payload`.
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

**DocId**
- `id` (string) — `autoId`

**Campos (padrão recomendado)**
- `type` (string)
- `createdAt` (timestamp)
- `payload` (map) — dados variáveis por tipo

**Tipos observados no código (exemplos)**
- `appointments_sync_summary`
- `push_reminder_send_summary`
- `push_reminder_sent`
- `push_reminder_failed`
- `appointment_reminder`
- `attendance_import_summary`
- `patient_register`
- `patient_deactivate`
- `patient_deactivate_not_found`
- `push_enabled`

**Exemplos de payload (forma, não conteúdo sensível)**
- `appointments_sync_summary.payload`: `{ fromIsoDate: string, toIsoDate: string, scanned: number, upserted: number, cancelled: number }`
- `push_reminder_send_summary.payload`: `{ dryRun: boolean, candidates: number, sent: number, blocked: number, byReason: map }`
- `attendance_import_summary.payload`: `{ fromIsoDate: string, toIsoDate: string, totalLogs: number, byStatus: { present: number, absent: number } }`

---
