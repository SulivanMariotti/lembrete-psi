# Firestore (Rules, Claims e Modelo)

## Problema típico
`permission-denied` ao usar `onSnapshot` no client ocorre quando:
- Rules não permitem o path consultado, ou
- a query (where/orderBy) não é compatível com as Rules

## Guidelines
- Paciente nunca deve ler coleções “globais” (ex.: `history`, todos `users`)
- Preferir: paciente lê só o próprio documento e dados associados por chave do próprio paciente.

## Claims / Role
- Admin: `request.auth.token.role == "admin"`
- Paciente: login via endpoint server-side deve garantir auth válido e, idealmente, claims coerentes.

## Padrões de leitura do painel do paciente (PatientFlow)
- Perfil: `users/{uid}`
- Agenda: `appointments` filtrando por `phone` e fallback por `email`
- Notificações: `subscribers/{phoneCanonical}`
- Notas: `patient_notes` por `patientId == uid`

## Regras recomendadas
- `users/{uid}`: read para o próprio uid
- `appointments`: read se `resource.data.phone` == `users.phone` OU `users.phoneCanonical` OU `resource.data.email` == `auth.email`
- `patient_notes`: read/create para patientId==uid (update/delete opcional)
- `subscribers`: read/update estrito para o próprio doc (por email ou por phoneCanonical — escolher um padrão e manter)

## Checklist de teste
- Login paciente
- Abrir painel e confirmar ausência de `permission-denied`
- Validar que paciente não consegue ler `history` nem listar `users`
