# Firestore Schema Snapshot (Lembrete Psi)

> Objetivo clínico do produto: sustentar o vínculo terapêutico por **constância**. A tecnologia automatiza lembretes e follow-ups para reduzir faltas e reforçar que comparecer é parte do cuidado.

**Data do snapshot:** 10/02/2026

## Convenções gerais

- **phoneCanonical**: string canônica do telefone (ex.: `55DDDNXXXXXXXX` sem símbolos).  
  Usado como chave consistente entre coleções (especialmente `subscribers/{phoneCanonical}`).
- **uid**: identificador do Firebase Auth para a conta do paciente (fonte de verdade em `users/{uid}`).
- **timestamps**: sempre `Timestamp` do Firestore (serverTimestamp quando possível).
- **Histórico (auditoria)**: usar `history` como coleção de logs com schema flexível (ver seção específica).

---

## Coleção: `config`

### Documento: `config/global`
Centraliza configurações do sistema (admin).

Campos (estáveis)
- `contractEnabled`: boolean
- `contractText`: string (texto/termos do contrato)
- `whatsappEnabled`: boolean
- `whatsappProvider`: string (se aplicável)
- `msg1Enabled`: boolean
- `msg2Enabled`: boolean
- `msg3Enabled`: boolean
- `msg1OffsetHours`: number (ex.: 48)
- `msg2OffsetHours`: number (ex.: 24)
- `msg3OffsetHours`: number (ex.: 8 / manhã)
- `msg1TemplateTitle`: string
- `msg1TemplateBody`: string
- `msg2TemplateTitle`: string
- `msg2TemplateBody`: string
- `msg3TemplateTitle`: string
- `msg3TemplateBody`: string

Presença/Falta (follow-up)
- `attendanceFollowupPresentTitle`: string
- `attendanceFollowupPresentBody`: string
- `attendanceFollowupAbsentTitle`: string
- `attendanceFollowupAbsentBody`: string

Placeholders suportados nos templates
- `{{nome}}` ou `{nome}`
- `{data}` (DD/MM/AAAA)
- `{dataIso}` (YYYY-MM-DD)
- `{hora}`
- `{profissional}`
- `{servico}`
- `{local}`
- `{id}`

---

## Coleção: `users`

### Documento: `users/{uid}`
**Fonte de verdade** do paciente (autorização e status).

Campos (estáveis)
- `role`: string (`"patient"` | `"admin"` | `"staff"` … conforme uso)
- `status`: string (`"active"` | `"inactive"`)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

Identidade/contato (recomendado manter coerente)
- `displayName`: string
- `email`: string
- `phone`: string (pode ser igual a phoneCanonical)
- `phoneNumber`: string (legado/compat)
- `phoneCanonical`: string

Desativação (quando `status="inactive"`)
- `deletedAt`: Timestamp

Observações
- Regras e endpoints server-side devem bloquear envios e acesso a dados sensíveis quando `status="inactive"`.

---

## Coleção: `subscribers`

### Documento: `subscribers/{phoneCanonical}`
Registro do dispositivo do paciente para **Web Push**.

Campos (estáveis)
- `pushToken`: string (token/endpoint do web push)
- `pushProvider`: string (opcional; ex.: `"fcm"` / `"webpush"`)
- `isActive`: boolean (opcional; se existir, considerar na elegibilidade de envio)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

Observações
- Se não houver `pushToken`, previews de disparo devem explicar `blockedReason = "no_token"` (ou equivalente), mesmo em dryRun.

---

## Coleção: `appointments`

### Documento: `appointments/{appointmentId}`
Agenda consolidada (origem: upload de planilha + sincronização).

Campos (estáveis)
- `patientId`: string (quando disponível)
- `uid`: string (opcional; se vinculado ao usuário)
- `phone`: string (preferir `phoneCanonical` se possível)
- `phoneCanonical`: string (recomendado)
- `email`: string (opcional)
- `patientName`: string
- `professional`: string
- `service`: string
- `location`: string
- `startAt`: Timestamp
- `endAt`: Timestamp
- `dateIso`: string (`YYYY-MM-DD`) (opcional, facilita queries)
- `status`: string (ex.: `"scheduled"` | `"cancelled"` | `"done"` — conforme implementação)
- `sourceBatchId`: string (id do upload/sync)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

Regras de sincronização (resumo)
- Manter histórico: não apagar passado.
- Cancelar/remover apenas **futuros** removidos do upload (marcar como cancelado, ou deletar futuros conforme regra definida).
- Operações críticas (ex.: bloquear envios para inativos) devem ser server-side.

---

## Coleção: `attendance_logs`

### Documento: `attendance_logs/{logId}`
Registros de presença/falta (origem: import de planilha ou registro interno).

Campos (estáveis)
- `appointmentId`: string (quando houver vínculo)
- `uid`: string (opcional)
- `phoneCanonical`: string
- `patientName`: string
- `dateIso`: string (`YYYY-MM-DD`)
- `time`: string (`HH:mm`) (opcional)
- `status`: string (`"present"` | `"absent"`)
- `professional`: string
- `service`: string
- `location`: string
- `source`: string (ex.: `"sheet_import"` | `"manual"`)
- `createdAt`: Timestamp

Observações
- Usado para gerar follow-ups (parabenizar presença / orientar após falta) reforçando constância.

---

## Coleção: `patient_notes`

### Documento: `patient_notes/{noteId}` (ou subcoleção em `users/{uid}/notes/{noteId}` se escolhido)
Anotações do paciente para a sessão (foco em responsabilização e preparação).

Campos (estáveis)
- `uid`: string (se coleção raiz)
- `phoneCanonical`: string (opcional)
- `title`: string
- `content`: string
- `tags`: array<string> (opcional)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

---

## Coleção: `history` (schema flexível)

### Documento: `history/{autoId}`
Coleção de logs/auditoria com schema flexível.

Campos (padrão recomendado)
- `type`: string (tipo do evento)
- `createdAt`: Timestamp
- `payload`: map (conteúdo variável por `type`)

Tipos recomendados (exemplos)
- `appointment_sync_started`
- `appointment_sync_completed`
- `appointment_future_cancelled`
- `reminder_send_dry_run`
- `reminder_send_executed`
- `attendance_followup_dry_run`
- `attendance_followup_executed`
- `user_deactivated`
- `subscriber_token_updated`

Exemplos de `payload` (sem dados sensíveis)
- Para envio de lembretes:
  - `fromIsoDate`: string
  - `toIsoDate`: string
  - `candidates`: number
  - `sent`: number
  - `blocked`: number
  - `blockedNoToken`: number
  - `blockedInactive`: number
  - `byStatus`: map (`present/absent`)
  - `sample`: array<map> (apenas campos não sensíveis; ideal: ids e razões)

Observações
- Evitar armazenar conteúdo sensível (mensagem completa, telefone/email) em `payload`. Preferir IDs e contagens.
- `history` é chave para rastreabilidade do cuidado ativo sem expor dados do paciente.

---

## Checklist rápido de consistência

- [ ] `users/{uid}.status` controla elegibilidade (active/inactive).
- [ ] `subscribers/{phoneCanonical}.pushToken` presente para disparos.
- [ ] `appointments` e `attendance_logs` preferem `phoneCanonical`.
- [ ] Endpoints de envio validam **server-side**: token + status do usuário + datas.
- [ ] `history` registra execução e bloqueios com `type/createdAt/payload`.
