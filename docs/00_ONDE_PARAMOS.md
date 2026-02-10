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
- Criar `docs/09_FIREBASE_SCHEMA.md` com snapshot do schema (coleções/campos sem dados sensíveis).
- Revisar/explicar no UI: placeholders disponíveis (dica no Config).
- Melhorar Dashboard (métricas clínicas, constância por paciente, etc.) — futuro.

## Próximo passo (1 por vez)
**Próximo passo (1/1):** criar/atualizar `docs/09_FIREBASE_SCHEMA.md` (schema do Firestore), documentando:
- coleções e campos estáveis
- `history` como coleção de logs com schema flexível (padrão recomendado: `type`, `createdAt`, `payload` + exemplos de `type`).
