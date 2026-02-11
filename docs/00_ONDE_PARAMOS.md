# Lembrete Psi — Onde paramos

Data: 2026-02-10

## Objetivo do projeto
Reduzir faltas e sustentar o vínculo terapêutico com:
- lembretes automáticos (48h, 24h, manhã)
- psicoeducação no painel do paciente
- responsabilização (constância, histórico, transparência)
- UX deliberada (sem “cancelar sessão” fácil; sessão como contrato)

## Estado atual (confirmado)

### ✅ Acesso do paciente
- Login do paciente validando em `users`.
- Cadastro via Admin → paciente acessa o painel.
- Firestore Rules ajustadas para evitar `permission-denied`.

### ✅ Administração de pacientes
- Desativação atualiza doc real do paciente em `users/{uid}` com `status:"inactive"` + `deletedAt`.

### ✅ Bloqueio de envios para pacientes inativos (server-side)
- Implementado:
  - `src/app/api/admin/reminders/send/route.js`
  - `src/app/api/admin/attendance/send-followups/route.js`
- Regra: inativo bloqueia envio e contabiliza `blockedInactive...`.

### ✅ Agenda: “Sincronizar” consolidado
- Upload + verificação + sincronização (upsert).
- Sessões futuras removidas do upload são marcadas `cancelled` (mantém histórico).
- `src/components/Admin/AdminScheduleTab.js`

### ✅ Presença/Falta (Constância)
- Mensagens configuráveis em Configurações e salvas em `config/global`.
- Templates suportam placeholders (ex.: `{nome}`, `{data}`, `{hora}`).
- Prévia (dryRun) exibe **amostra real interpolada** e informa bloqueios (`blockedReason`), mesmo quando não há pushToken.
- Arquivos:
  - `src/app/api/admin/attendance/send-followups/route.js`
  - `src/components/Admin/AdminAttendanceFollowupsCard.js`
  - `src/components/Admin/AdminConfigTab.js`

## Pendente (prioridade alta)
- Consolidar documentação do schema em **uma fonte de verdade**:
  - **Fonte oficial:** `docs/10_FIREBASE_SCHEMA.md`
  - `docs/09_FIREBASE_SCHEMA.md` fica como **resumo/índice** (compatibilidade)
- Esclarecer (na documentação) por que `history/{id}` tem documentos com campos diferentes (schema flexível) e registrar exemplos reais dos eventos atuais.
- Revisar/explicar no UI: placeholders disponíveis (dica no Config).
- Melhorar Dashboard (métricas clínicas, constância por paciente, etc.) — futuro.

## Próximo passo (1 por vez)
**Próximo passo (1/1):** padronizar o consumo de logs do Admin (`history`) para suportar os padrões existentes:
- `createdAt` (logs novos com `type`)
- `sentAt` (logs legados do endpoint antigo `/api/send`)

E, em paralelo, iniciar migração gradual dos endpoints para o padrão recomendado (ver `docs/11_HISTORY_LOGGING_STANDARD.md`).
