# Firebase / Firestore — Schema (snapshot)

> Sem dados sensíveis. Apenas estrutura: coleções, docId, campos e tipos.

## Coleções

### users/{uid}
DocId:
- uid (string) — geralmente igual ao campo `uid`

Campos:
- role: string
- status: string
- patientExternalId: string
- name: string
- email: string
- phone: string
- phoneCanonical: string
- createdAt: timestamp
- updatedAt: timestamp
- deletedAt: timestamp (opcional)
- inactiveReason: string (opcional)
- mergedTo: string|null (opcional)
- isActive: boolean (opcional)
- disabled: boolean (opcional)
- disabledAt: timestamp (opcional)

### subscribers/{phoneCanonical}
DocId:
- phoneCanonical (string)

Campos:
- pushToken: string (opcional)
- token: string (opcional)
- email: string (opcional)
- isActive: boolean (opcional)
- lastSeen: timestamp (opcional)
- createdAt: timestamp (opcional)
- updatedAt: timestamp (opcional)

### appointments/{appointmentId}
DocId:
- appointmentId (string) — derivado de phone+date+time+profissional (ou similar)

Campos:
- patientExternalId: string (opcional)
- patientUid: string (opcional)
- phone: string 
- phoneCanonical: string (opcional)
- name: string (opcional)
- email: string (opcional)
- isoDate: string (YYYY-MM-DD)
- time: string (HH:mm)
- professional/profissional: string
- service: string
- location: string
- status: string (scheduled|cancelled|...)
- cancelReason: string (opcional)
- cancelledAt: timestamp (opcional)
- source: string (admin_sync|...)
- sourceUploadId: string (opcional)
- createdAt: timestamp (opcional)
- updatedAt: timestamp

### attendance_logs/{logId}
DocId:
- logId (string) — (definir padrão real do import)

Campos:
- patientId: string (uid/externalId)
- patientExternalId: string (opcional)
- name: string
- phone: string
- phoneCanonical: string
- isoDate: string (YYYY-MM-DD)
- time: string (HH:mm)
- profissional: string
- service: string
- location: string
- status: string (present|absent)
- createdAt: timestamp
- updatedAt: timestamp

### patient_notes/{noteId}
DocId:
- autoId (string)

Campos:
- patientId: string (uid)
- createdAt: timestamp
- content: string
- phone: string

### config/{docId} (ex.: global)
DocId:
- global (string)

Campos:
- appointmentsLastSyncAt:timestamp
- appointmentsLastUploadId:string
- attendanceFollowupAbsentBody:string
- attendanceFollowupAbsentTitle:string
- attendanceFollowupPresentBody:string
- attendanceFollowupPresentTitle:string
- contractText:string
- contractVersion:number
- msg1:string
- msg12h:string
- msg2:string
- msg24h:string
- msg3:string
- msg48h:string
- reminderOffsetsHours:array
- 0:number
- 1:number
- 2:number
- updatedAt:timestamp
- whatsapp:string

### history/{id}
Tipo: coleção de logs/eventos (schema flexível)

DocId:
- autoId (string) — id gerado automaticamente

Campos (mínimo esperado / padrão recomendado):
- type: string (ex.: "reminder_send", "appointments_sync", "config_updated", etc.)
- createdAt: timestamp
- payload: map (detalhes variáveis do evento)

Observação:
- Por ser uma coleção de auditoria, documentos podem ter campos diferentes.
- O campo `type` define quais chaves existem dentro de `payload`.

Exemplos reais de `type` (preencher):
- type: "..."
- type: "..."
- type: "..."
