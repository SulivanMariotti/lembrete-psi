    # Mapa de Rotas (API) — Lembrete Psi

> Este arquivo é o índice oficial das rotas do sistema.
> Sempre que criarmos/alterarmos uma rota, atualizamos aqui.

## Admin

### Listar pacientes
- Arquivo: `src/app/api/admin/patients/list/route.js`
- Endpoint: `GET /api/admin/patients/list`
- Função: lista pacientes (role=patient), dedup por patientExternalId, oculta inativos, opcional includePush.
- Auth: `x-admin-secret` (quando configurado)

### Cadastrar/atualizar paciente
- Arquivo: `src/app/api/admin/patient/register/route.js`
- Endpoint: `POST /api/admin/patient/register`
- Função: cria/atualiza `users` com name/email/phoneCanonical/patientExternalId.

### Desativar paciente
- Arquivo: `src/app/api/admin/patient/delete/route.js`
- Endpoint: `POST /api/admin/patient/delete`
- Função: marca paciente como inativo no doc real `users/{uid}` (status/deletedAt) e bloqueia envios.
- Auth: `x-admin-secret`

### Enviar lembretes (Agenda)
- Arquivo: `src/app/api/admin/reminders/send/route.js`
- Endpoint: `POST /api/admin/reminders/send`
- Função: envia push conforme janelas (48h/24h/12h), com preview e contadores.
- Auth: `x-admin-secret`
- Regra: bloquear paciente inativo (server-side)

### Enviar presença/falta (Constância)
- Arquivo: `src/app/api/admin/attendance/send-followups/route.js`
- Endpoint: `POST /api/admin/attendance/send-followups`
- Função: após importação, dispara mensagens de reforço (presença) e psicoeducação (falta).
- Auth: `x-admin-secret`
- Regra: bloquear paciente inativo (server-side)

## Paciente

### Autenticação do paciente
- Arquivo: `src/app/api/patient-auth/route.js`
- Endpoint: `POST /api/patient-auth`
- Função: valida paciente em `users` e gera token; bloqueia inativos.

### Push register/status
- Arquivo: `src/app/api/patient/push/register/route.js`
- Endpoint: `POST /api/patient/push/register`
- Arquivo: `src/app/api/patient/push/status/route.js`
- Endpoint: `GET /api/patient/push/status`
- Função: registrar/verificar token do dispositivo (subscribers).
