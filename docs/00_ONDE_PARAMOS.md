# Onde paramos (Lembrete Psi)

Data: **2026-02-13**

## Contexto
Refatoração do **PatientFlow** (painel do paciente) para reduzir complexidade e consolidar a experiência clínica
(constância/psicoeducação), extraindo blocos em componentes reutilizáveis.

## Concluído hoje
### Step 9.3.9 — Extrair Status do Contrato
- Criado: `src/features/patient/components/ContractStatusCard.js`
- Integrado em: `src/components/Patient/PatientFlow.js`
- Fix: import duplicado de `ContractStatusCard` (build error).

### Step 9.3.10 — Extrair Mantra (Psicoeducação)
- Criado: `src/features/patient/components/PatientMantraCard.js`
- Integrado em: `src/components/Patient/PatientFlow.js`
- Fix: “Module not found” (arquivo no caminho/extensão correta).

### Step 9.3.11 — Identificação do paciente (Nome/Telefone)
- Criado: `src/features/patient/components/PatientContactCard.js`
- Integrado em: `src/components/Patient/PatientFlow.js`
- Fix: “Module not found” (arquivo no caminho/extensão correta).

### Step 9.3.12 — Notificações (Mobile-friendly)
- Criado: `src/features/patient/components/PatientNotificationsCard.js`
- Integrado em: `src/components/Patient/PatientFlow.js`
- Mudança UX:
  - Wrapper mais compacto (sem título redundante)
  - Menos altura no mobile (remove Card externo “engordando” o bloco)
  - Mantém o núcleo: notificações ativas neste aparelho (e call-to-action quando não estiver)

## Próximo passo sugerido
### Step 9.3.13 — Agenda compacta / Sessões (com foco em constância)
- Extrair o bloco de agenda/sessões para componente (ex.: `PatientSessionsCard`)
- Ajustar layout no mobile (menos “quebra de linha” e menos espaço vertical)
- Reforçar psicoeducação:
  - “O seu horário é um espaço sagrado de cuidado”
  - “Faltar interrompe um processo de evolução; a cura acontece na continuidade”

## Commit sugerido
`refactor(paciente): extrair notificações em componente e compactar layout`
