# Lembrete Psi — Onde paramos

Data: 2026-02-13

## Missão (produto)
Sustentar o vínculo terapêutico e reduzir faltas pela **constância**:
1) lembretes automáticos (48h, 24h, manhã)
2) psicoeducação no painel do paciente
3) responsabilização (contrato, constância, histórico/auditoria)
4) UX deliberada (sem “cancelar sessão” fácil; sessão como contrato)

---

## Estado atual (confirmado)

### ✅ Painel do paciente — refatoração feature-based (em andamento)
Estratégia:
- `src/features/patient/...` → tudo do domínio “paciente” (componentes, hooks, libs)
- `src/lib/shared/...` → apenas o que é realmente compartilhado

Refatoração já concluída até agora (Step 9.x):
1) `lib`: `phone.js`, `dates.js`, `ics.js`, `appointments.js`
2) `hooks`: `usePushStatus`, `useAppointmentsLastSync`, `usePatientAppointments`, `usePatientNotes`
3) `components`: `Skeleton`, `PatientHeader`, `NextSessionCard`, `NotificationStatusCard`, `PatientAgendaCard`, `PatientNotesCard`
4) **9.3.9**: `ContractStatusCard` (Contrato / Status do contrato)
5) **9.3.10**: `PatientMantraCard` (Mantra/psicoeducação rotativa)

### ✅ Contrato Terapêutico (modelo de dados)
1) Admin define em `config/global`:
   - `contractText` (string)
   - `contractVersion` (number)
2) Paciente aceita e grava em `users/{uid}`:
   - `contractAcceptedVersion` (number)
   - `contractAcceptedAt` (timestamp)
3) UI do paciente:
   - agora centralizada em `src/features/patient/components/ContractStatusCard.js`
   - `PatientFlow.js` só orquestra estado e action “Aceitar contrato”

### ✅ Mantra / Psicoeducação (UI)
- agora isolado em `src/features/patient/components/PatientMantraCard.js`
- objetivo: reforçar constância (“o segredo é a regularidade”) sem moralismo

### ✅ Push / Notificações (sem permission-denied)
- Painel do paciente **não lê** `subscribers/{phoneCanonical}` direto do Firestore.
- O paciente usa apenas rotas server-side:
  - `GET /api/patient/push/status`
  - `POST /api/patient/push/register`
- Recuperação de telefone quando ausente:
  - `GET /api/patient/resolve-phone` (resolve por email e tenta persistir em `users/{uid}`)

### ✅ Presença/Faltas (planilha) — Importação + Disparos por Constância
1) Import CSV (Admin) com validação (dryRun) + gravação
2) `attendance_logs` com chave composta:
   - `{patientId}_{isoDate}_{HHMM}_{profissionalSlug}`
3) Disparos por constância com `dryRun` retornando `sample` consistente
4) Bloqueios transparentes:
   - `blockedNoPhone`, `blockedNoToken`, `inactive_patient`, `inactive_subscriber`

---

## Erros corrigidos hoje (e causa)
1) **Import duplicado** do `ContractStatusCard` no `PatientFlow.js` → removido.
2) **Module not found**: `PatientMantraCard` → o arquivo não estava no caminho esperado (ou estava com extensão errada tipo `.js.txt`).
   - fix: criar `src/features/patient/components/PatientMantraCard.js` corretamente.

---

## Próximo passo (1 por vez)
**Step 9.3.11 (sugerido):** extrair “Card do paciente / Seu contato” para componente:
- `src/features/patient/components/PatientContactCard.js`
- resultado: `PatientFlow.js` com menos JSX e imports (mais modular).
