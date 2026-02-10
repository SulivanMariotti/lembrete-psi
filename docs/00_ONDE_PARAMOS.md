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
- Implementado nos endpoints:
  - `src/app/api/admin/reminders/send/route.js`
  - `src/app/api/admin/attendance/send-followups/route.js`

### ✅ Agenda: “Sincronizar” consolidado
- Removida duplicidade de reconciliação.
- Sessões futuras que sumirem do upload são marcadas como `cancelled` com `cancelReason:"removed_from_upload"` (mantém histórico).
- Arquivo:
  - `src/components/Admin/AdminScheduleTab.js`

## Pendente (prioridade alta)
- Documentar no fluxo do produto o comportamento do “Sincronizar” (agenda como fonte da verdade + cancelar futuros removidos do upload).
- Validar e documentar o cálculo da “Taxa de comparecimento” (Presença/Falta) e confirmar se precisa ponderação (ex.: considerar only known statuses).
- Criar/confirmar no painel Configurações:
  - templates de mensagens de presença e falta (conteúdo configurável)
  - lógica/critério de disparo presença/falta por planilha

## Próximo passo (1 por vez)
**Próximo passo (1/1):** atualizar a documentação do produto (`docs/07_FLUXOS_E_DISPAROS.md`) explicando claramente o que “Sincronizar” faz (upsert + cancelamento de futuros removidos do upload) e registrar o cálculo atual da “Taxa de comparecimento”.
