# Firebase / Firestore — Schema (snapshot)

> **Sem dados sensíveis.** Estrutura de coleções/campos.

---

## 1) users/{uid}

Fonte de verdade do paciente.

**Campos principais**
- `role` (string) — `admin|patient`
- `status` (string) — `active|inactive`
- `name` (string)
- `email` (string, opcional)
- `phone` (string)
- `phoneCanonical` (string) — chave canônica (ex.: `11999999999`)
- `createdAt`, `updatedAt` (timestamp)

**Contrato (aceite)**
- `contractAcceptedVersion` (number, opcional)
- `contractAcceptedAt` (timestamp, opcional)

**Código de Vinculação (pareamento)**
> Código não é armazenado em texto puro.

- `pairCodeHash` (string) — sha256(salt:code)
- `pairCodeSalt` (string)
- `pairCodeStatus` (string) — `active|used|revoked`
- `pairCodeCreatedAt` (timestamp)
- `pairCodeUsedAt` (timestamp, null quando não usado)
- `pairCodeLast4` (string) — últimos 4 para referência operacional

---

## 2) subscribers/{phoneCanonical}
Push do navegador (web push).

- `pushToken` (string, opcional)
- `email` (string, opcional)
- `isActive` (boolean, opcional)
- `lastSeen`, `createdAt`, `updatedAt` (timestamp, opcional)

> Painel do paciente deve preferir `/api/patient/push/*` para evitar `permission-denied`.

---

## 3) appointments/{id}
Agenda.

Campos típicos:
- `phone` (string)
- `phoneCanonical` (string, recomendado)
- `name` (string)
- `dateIso` (string `YYYY-MM-DD`)
- `time` (string `HH:mm`)
- `professional`, `service`, `location` (string, opcional)
- `status` (string), `cancelled` (boolean, opcional)
- `createdAt`, `updatedAt` (timestamp, opcional)

---

## 4) attendance_logs/{id}
Presença/Falta importada.

- `phoneCanonical` (string)
- `dateIso` (string)
- `status` (string `present|absent`)
- `createdAt` (timestamp)
- `payload` (map, opcional)

---

## 5) config/global
Configurações globais.

- `whatsapp` (string)
- `contractText` (string)
- `contractVersion` (number)
- Mensagens de lembrete: `msg1`, `msg2`, `msg3` (strings)
- Templates presença/falta:
  - `attendanceFollowupPresentTitle/Body`
  - `attendanceFollowupAbsentTitle/Body`
- `updatedAt` (timestamp)

---

## 6) history/{id}
Auditoria (schema flexível).

**Recomendado**
- `type` (string)
- `createdAt` (timestamp)
- `payload` (map)

**Legado**
- `sentAt` (timestamp)
- `summary` (string)
- `types` (array<string>)

Tipos observados/relevantes:
- `push_reminder_send_summary`, `push_reminder_sent`
- `appointments_sync_summary`
- `attendance_import_summary`
- `patient_pair_code_issued`, `patient_paired_device`
