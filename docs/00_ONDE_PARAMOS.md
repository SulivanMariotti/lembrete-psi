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
- Endpoint de login do paciente validando em `users`.
- Cadastro via Admin → paciente acessa o painel.
- Firestore Rules ajustadas para evitar `permission-denied` (subscribers do próprio paciente).

### ✅ Administração de pacientes (desativação)
- Desativação atualiza doc real do paciente em `users/{uid}` com `status:"inactive"` + `deletedAt`.

### ✅ Bloqueio de envios para pacientes inativos (server-side)
- Implementado bloqueio nos endpoints:
  - `src/app/api/admin/reminders/send/route.js`
  - `src/app/api/admin/attendance/send-followups/route.js`
- Regra: se paciente estiver inativo (status/flags/deletedAt), o endpoint bloqueia e contabiliza `blockedInactivePatient`.

### ✅ Agenda: “Sincronizar” consolidado
- Removida duplicidade de reconciliação.
- Sessões futuras que sumirem do upload são marcadas como `cancelled` com `cancelReason:"removed_from_upload"` (mantém histórico).
- Arquivo:
  - `src/components/Admin/AdminScheduleTab.js`

### ✅ Presença/Falta: templates configuráveis
- Configurações agora permitem editar textos de:
  - Presença (título + corpo)
  - Falta (título + corpo)
- Campos salvos em `config/global`:
  - `attendanceFollowupPresentTitle`, `attendanceFollowupPresentBody`
  - `attendanceFollowupAbsentTitle`, `attendanceFollowupAbsentBody`
- O envio/preview de followups usa esses campos automaticamente.
- Arquivo UI:
  - `src/components/Admin/AdminConfigTab.js`

## Pendente (prioridade alta)
- Padronizar placeholders (nome/data/hora/profissional) para mensagens de presença/falta, se você quiser personalização por paciente.
- Melhorar a UI do Admin (Config) com dicas de placeholders permitidos (futuro).
- Criar `docs/09_FIREBASE_SCHEMA.md` com snapshot dos campos/coleções (sem dados sensíveis).

## Próximo passo (1 por vez)
**Próximo passo (1/1):** validar ponta-a-ponta o Preview/Envio de Presença/Falta usando os templates do `config/global` e, se aprovado, adicionar placeholders padronizados (ex.: {nome}, {data}, {hora}) no disparo.
