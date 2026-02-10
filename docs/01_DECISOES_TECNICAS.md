# Decisões técnicas (fonte da verdade)

## Identidade do paciente
- **Doc real do paciente**: `users/{uid}` (uid do Firebase Auth / docId do Firestore)
- Identificador “público”/externo: `patientExternalId`
- Telefone canônico: `phoneCanonical` (apenas dígitos)

## Coleções
- `users`: fonte de verdade do cadastro/estado do paciente
- `appointments`: agenda importada (associar por `phone` e/ou `phoneCanonical` e opcionalmente `email`)
- `subscribers`: estado do dispositivo/push (pushToken, lastSeen, flags de isActive)
- `patient_notes`: notas do paciente (patientId == uid)
- `history`: logs admin/ações (admin-only)

## Segurança & acesso
- Admin: acesso total via rotas server-side (Admin SDK) e/ou Rules com `isAdmin()`
- Paciente: leitura apenas do próprio `users/{uid}`, seus `appointments`, suas `patient_notes`, e (se necessário) seu `subscribers/{phoneCanonical}`.

## UX / Psicologia do produto
- Sem botão “Cancelar Sessão” no painel do paciente (barreira saudável contra resistência momentânea)
- Sem “Confirmar presença” como condição de existência do encontro
- Mensagens orientadas à constância: “O segredo da terapia é a continuidade”
