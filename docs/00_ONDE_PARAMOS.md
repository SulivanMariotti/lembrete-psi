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

### ✅ Documentação do fluxo (produto)
- Fluxos e disparos atualizados no `docs/07_FLUXOS_E_DISPAROS.md`, incluindo:
  - comportamento oficial do “Sincronizar” (upsert + cancelar futuros removidos)
  - cálculo atual da taxa de comparecimento

## Pendente (prioridade alta)
- Confirmar e/ou implementar no painel Configurações:
  - templates das mensagens de presença e falta (conteúdo configurável)
  - clareza de quando disparar presença/falta (critérios e janelas)
- Validar se “Taxa de comparecimento” precisa ajustes (ex.: excluir registros “unknown” já é o padrão; confirmar se é isso mesmo que você quer clinicamente).
- Revisar UI/UX: explicar no Admin (Agenda) que “Sincronizar” cancela futuros removidos do upload (para evitar surpresa).

## Próximo passo (1 por vez)
**Próximo passo (1/1):** revisar e consolidar o módulo de Presença/Falta:
- validar cálculo exibido (taxa, top faltas)
- garantir que templates de mensagens (presença e falta) sejam configuráveis no painel Configurações
- auditar a lógica atual de disparo e deixar explícita no `docs/07_FLUXOS_E_DISPAROS.md`
