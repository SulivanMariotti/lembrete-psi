# 11_HISTORY_LOGGING_STANDARD.md

Este documento define o **padrão de logs** do Firestore para a coleção `history`, que é **schema flexível**, mas deve seguir um contrato mínimo para manter rastreabilidade e permitir auditoria clínica-operacional (sem armazenar conteúdo sensível do paciente).

> Princípio do produto: **constância é cuidado**. Logs existem para sustentar o processo: prevenir falhas de envio, identificar bloqueios (ex.: paciente inativo), e garantir que o sistema não “abandone” o paciente por erro técnico.

---

## Coleção: `history/{id}`

### Campos obrigatórios (mínimo recomendado)

- `type` *(string)* — tipo do evento (tabela abaixo).
- `createdAt` *(timestamp)* — quando ocorreu (serverTimestamp recomendado).
- `payload` *(map)* — dados estruturados do evento (sem PII sensível).

### Campos opcionais úteis

- `severity` *(string)* — `info | warn | error`
- `actor` *(string)* — `system | admin:{uid} | patient:{uid}`
- `correlationId` *(string)* — id para correlacionar múltiplos logs de um mesmo fluxo
- `version` *(string)* — versão do schema do payload (ex.: `v1`)

---

## Regras de privacidade (importante)

✅ Pode:
- `patientId` (uid), `phoneCanonical` (hash/normalizado), `appointmentId`, `templateKey`
- contadores, status, razões de bloqueio, ids técnicos

🚫 Evitar (não registrar):
- conteúdo completo de mensagens (texto do template interpolado)
- anotações clínicas (`patient_notes`)
- diagnósticos, queixas, eventos íntimos
- emails e telefones “crus” (use `phoneCanonical`)

---

## Tipos de log (type) — padrão recomendado

### 1) Envio de lembretes de agenda

**type:** `reminder.send.attempt`

Payload mínimo:
- `appointmentId` *(string)*
- `patientUid` *(string)*
- `phoneCanonical` *(string)*
- `scheduledAt` *(timestamp|string iso)* — horário da sessão
- `offsetHours` *(number)* — ex.: 48, 24, 0
- `channel` *(string)* — `push`
- `dryRun` *(boolean)*
- `status` *(string)* — `sent | blocked | failed`
- `blockedReason` *(string|null)* — `no_token | inactive | missing_patient | rule_denied | ...`
- `errorCode` *(string|null)*
- `errorMessage` *(string|null)* (curto)

---

### 2) Envio de presença/falta (follow-up)

**type:** `attendance.followup.attempt`

Payload mínimo:
- `attendanceLogId` *(string)*
- `patientUid` *(string)*
- `phoneCanonical` *(string)*
- `attendanceStatus` *(string)* — `present | absent`
- `templateKeyTitle` *(string)* — ex.: `attendanceFollowupPresentTitle`
- `templateKeyBody` *(string)*
- `dryRun` *(boolean)*
- `status` *(string)* — `sent | blocked | failed`
- `blockedReason` *(string|null)*
- `errorCode` *(string|null)*
- `errorMessage` *(string|null)*

> Observação: o preview (dryRun) deve registrar **apenas** placeholders e metadados, não o texto final.

---

### 3) Importação/sincronização de agenda

**type:** `appointments.sync`

Payload mínimo:
- `source` *(string)* — `csv`
- `range` *(map)* — `{ fromIso, toIso }`
- `stats` *(map)* — `{ created, updated, canceledFuture, keptPast, total }`
- `dryRun` *(boolean)*
- `errorCode` *(string|null)*
- `errorMessage` *(string|null)*

---

### 4) Importação de presença/falta

**type:** `attendance.import`

Payload mínimo:
- `source` *(string)* — `csv`
- `range` *(map)* — `{ fromIso, toIso }`
- `stats` *(map)* — `{ present, absent, total }`
- `dryRun` *(boolean)*
- `errorCode` *(string|null)*
- `errorMessage` *(string|null)*

---

### 5) Gestão de usuários / papéis

**type:** `users.role.repair`

Payload mínimo:
- `dryRun` *(boolean)*
- `scanned` *(number)*
- `updated` *(number)*
- `skipped` *(number)*
- `notes` *(string|null)*

---

## Exemplos (payloads) — sem dados sensíveis

### Exemplo: envio bloqueado por paciente inativo
```json
{
  "type": "attendance.followup.attempt",
  "createdAt": "serverTimestamp",
  "payload": {
    "attendanceLogId": "att_2026-02-09_001",
    "patientUid": "uid_ABC123",
    "phoneCanonical": "5511999999999",
    "attendanceStatus": "absent",
    "templateKeyTitle": "attendanceFollowupAbsentTitle",
    "templateKeyBody": "attendanceFollowupAbsentBody",
    "dryRun": false,
    "status": "blocked",
    "blockedReason": "inactive"
  }
}
```

### Exemplo: sync de agenda (dryRun)
```json
{
  "type": "appointments.sync",
  "createdAt": "serverTimestamp",
  "payload": {
    "source": "csv",
    "range": { "fromIso": "2026-02-01", "toIso": "2026-02-29" },
    "stats": { "created": 12, "updated": 4, "canceledFuture": 2, "keptPast": 8, "total": 26 },
    "dryRun": true
  }
}
```

---

## Checklist de implementação (para o dev)

- [ ] Sempre usar `serverTimestamp()` para `createdAt`
- [ ] Nunca registrar texto final de mensagens
- [ ] Sempre registrar `blockedReason` quando `status=blocked`
- [ ] Preferir `phoneCanonical` em vez de `phone` cru
- [ ] Garantir que endpoints server-side escrevam logs em `history`

