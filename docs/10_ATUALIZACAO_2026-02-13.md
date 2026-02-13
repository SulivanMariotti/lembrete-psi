# Lembrete Psi — Atualização (2026-02-13)

## Contexto
Hoje seguimos a refatoração do **Painel do Paciente** com foco em evolução futura (código mais modular, fácil de manter e estender). A estratégia escolhida foi **feature-based**:

- `src/features/patient/...` → tudo que é domínio do paciente (componentes, hooks, libs, services)
- `src/lib/shared/...` → apenas o que é realmente compartilhado entre Admin e Patient

## Objetivo clínico (diretriz do produto)
O painel do paciente continua orientado para **sustentação do vínculo terapêutico**:
- reforçar constância e compromisso com o horário;
- reduzir atrito (cuidado ativo);
- psicoeducar sem moralismo;
- responsabilizar com acolhimento.

---

## O que foi entregue hoje (passo a passo concluído)
### Step 9.1 — Extrair utilitários do PatientFlow
- Criado `src/features/patient/lib/phone.js`, `dates.js`, `ics.js`
- `PatientFlow.js` passou a importar essas funções (sem mudança de comportamento)

### Step 9.2 — Separar lógica de dados em hooks
- Criados hooks do paciente (agenda, notas, push, lastSync):
  - `src/features/patient/hooks/usePushStatus.js`
  - `src/features/patient/hooks/useAppointmentsLastSync.js`
  - `src/features/patient/hooks/usePatientAppointments.js`
  - `src/features/patient/hooks/usePatientNotes.js`
- `PatientFlow.js` passou a usar os hooks (menos estado e menos lógica acoplada ao JSX)

### Step 9.3 — Quebrar UI do PatientFlow em componentes (várias fatias)
#### 9.3.2 / 9.3.3 — Skeleton
- Novo `src/features/patient/components/Skeleton.js`
- Removido Skeleton interno do `PatientFlow.js` (agora importa componente)

#### 9.3.4 — Cabeçalho (PatientHeader)
- Novo `src/features/patient/components/PatientHeader.js`
- `PatientFlow.js` passou a renderizar `<PatientHeader />`

#### 9.3.5 — Card da Próxima Sessão (NextSessionCard)
- Novo `src/features/patient/components/NextSessionCard.js`
- Adicionada lib auxiliar `src/features/patient/lib/appointments.js` (chip/status/labels)
- `PatientFlow.js` passou a renderizar `<NextSessionCard />`

#### 9.3.6 — Notificações (NotificationStatusCard)
- Novo `src/features/patient/components/NotificationStatusCard.js`
- **Hotfix aplicado** para corrigir erro de parsing (try/catch solto removido do PatientFlow)

#### 9.3.7 — Agenda (PatientAgendaCard + AppointmentMiniRow)
- Novo `src/features/patient/components/PatientAgendaCard.js`
- Novo `src/features/patient/components/AppointmentMiniRow.js`
- `PatientFlow.js` passou a renderizar `<PatientAgendaCard />`

#### 9.3.8 — Diário rápido / Notas (PatientNotesCard)
- Novo `src/features/patient/components/PatientNotesCard.js`
- **Hotfix aplicado** para corrigir erro de parsing (JSX mal fechado no PatientFlow)

#### 9.3.9 — Contrato / Status do Contrato (ContractStatusCard)
- Novo `src/features/patient/components/ContractStatusCard.js`
  - Centraliza “Contrato Terapêutico” e o **status** (aceito/pendente)
  - Mantém o tom clínico: constância, compromisso e cuidado com o processo
- `PatientFlow.js` passou a renderizar `<ContractStatusCard />` e removeu o bloco antigo (sem duplicidade)
- Hotfix: removido import duplicado do `ContractStatusCard` que quebrava o build

---

## Checklist de validação (rápido)
No painel do paciente:
- [ ] Header mostra identificação e menu (sem duplicidade/bugs visuais)
- [ ] Próxima sessão: WhatsApp + “Adicionar ao calendário” (ICS) funcionando
- [ ] Notificações: ativar/estado do token sem travar a UI
- [ ] Agenda: alternar Compacta/Completa e expandir semanas/meses
- [ ] Diário rápido: criar nota, listar notas e abrir modal
- [ ] Contrato: status correto + botão “Aceitar contrato” aparece apenas quando pendente

---

## Próximo passo (1 por vez)
### Step 9.3.10 — Ajustar identificação e duplicidades no topo do Painel do Paciente
Objetivo:
- garantir que o paciente veja claramente **quem está logado** (nome) de forma consistente;
- evitar duplicidade de blocos de identificação/status;
- revisar layout mobile (sem ocupar espaço demais no topo).

Resultado esperado:
- Header/área superior com nome do paciente (e/ou “Olá, {nome}”) **sem duplicidade** com o card de perfil.
