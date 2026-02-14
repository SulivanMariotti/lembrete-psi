# Rotas API (contratos)

## Admin
- `GET /api/admin/patients/list`
  - Auth: `x-admin-secret` (se configurado)
  - Retorno: `{ ok, count, patients: [...] }`
  - Filtros: role == patient; esconde inativos; dedup por patientExternalId
  - Opcional: includePush -> hasPushToken

- `POST /api/admin/patient/delete`
  - Objetivo: desativar paciente no doc real `users/{uid}`
  - Body recomendado: `{ uid, patientExternalId, email, phoneCanonical, reason }`
  - Efeito: `status:"inactive"`, `deletedAt`, `inactiveReason`

## Paciente
- `POST /api/patient-auth`
  - Objetivo: login do paciente validando em `users`
  - Retorno: `{ ok:true, token, uid }` (custom token)
  - Deve bloquear inativos (status, deletedAt, etc.)
