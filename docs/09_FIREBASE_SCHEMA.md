# Firebase / Firestore — Schema (snapshot)

> Objetivo: registrar a estrutura das coleções e campos sem valores sensíveis.

## Coleções

### users/{uid}
Campos:
- role: string
- status: string
- patientExternalId: string
- name: string
- email: string
- phone: string
- phoneCanonical: string
- contractAcceptedVersion: number (opcional)
- contractAcceptedAt: timestamp (opcional)
- createdAt: timestamp
- updatedAt: timestamp
- deletedAt: timestamp (opcional)
- inactiveReason: string (opcional)
- mergedTo: string|null (opcional)

### subscribers/{phoneCanonical}
Campos:
- pushToken: string (opcional)
- token: string (opcional)
- email: string (opcional)
- phoneCanonical: string (opcional)
- isActive: boolean (opcional)
- lastSeen: timestamp (opcional)
- createdAt: timestamp (opcional)
- updatedAt: timestamp (opcional)

### appointments/{appointmentId}
Campos:
- patientExternalId: string (opcional)
- phone: string
- email: string (opcional)
- isoDate: string (YYYY-MM-DD)
- time: string (HH:mm)
- professional: string
- service: string
- location: string
- status: string (scheduled|cancelled|...)
- source: string (admin_sync|...)
- sourceUploadId: string (opcional)
- createdAt: timestamp (opcional)
- updatedAt: timestamp

### patient_notes/{noteId}
Campos:
- patientId: string (uid)
- text: string
- createdAt: timestamp
- updatedAt: timestamp (opcional)

### config/{docId}  (ex.: global)
Campos:
- whatsapp: string
- contractVersion: number
- contractText: string
- msg1: string
- msg2: string
- msg3: string
- reminderOffsetsHours: array<number>
- attendanceFollowupPresentTitle: string (opcional)
- attendanceFollowupPresentBody: string (opcional)
- attendanceFollowupAbsentTitle: string (opcional)
- attendanceFollowupAbsentBody: string (opcional)
- updatedAt: timestamp

### history/{id}
Campos:
- type: string
- createdAt: timestamp
- payload: map
