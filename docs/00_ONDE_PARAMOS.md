# Onde paramos (Lembrete Psi)

Data: **2026-02-13**

## Contexto
Estamos refatorando o **PatientFlow** (painel do paciente) para reduzir complexidade e consolidar a experiência clínica (constância/psicoeducação), extraindo blocos em componentes reutilizáveis.

## Concluído hoje
### Step 9.3.9 — Extrair Status do Contrato
- Criado componente: `src/features/patient/components/ContractStatusCard.js`
- Atualizado: `src/components/Patient/PatientFlow.js` para usar `ContractStatusCard`
- Ajustes:
  - Removido bloco antigo do contrato (evitar duplicidade)
  - Adicionado `acceptContractBusy` para evitar double-click em “Aceitar contrato”
- Correção aplicada:
  - **Import duplicado** de `ContractStatusCard` causava build error (“already been declared”).

### Step 9.3.10 — Extrair Mantra (Psicoeducação)
- Criado componente: `src/features/patient/components/PatientMantraCard.js`
- Atualizado: `src/components/Patient/PatientFlow.js` para usar `PatientMantraCard`
- Correção aplicada:
  - Build error “Module not found” por arquivo não estar no caminho/ extensão correta (ex.: `.js.txt`).
  - Solução: garantir `PatientMantraCard.js` em `src/features/patient/components/`.

### Step 9.3.11 — Identificação do paciente (Nome/Telefone)
- Criado componente: `src/features/patient/components/PatientContactCard.js`
- Atualizado: `src/components/Patient/PatientFlow.js` para usar `PatientContactCard`
- Correção aplicada:
  - Build error “Module not found” por arquivo não estar no caminho/ extensão correta (ex.: `.js.txt`).
  - Solução: garantir `PatientContactCard.js` em `src/features/patient/components/`.

## Próximo passo sugerido
### Step 9.3.12 — Notificações / Checklist (UX + componente)
- Extrair o bloco de **Notificações** e/ou **Checklist** (especialmente para mobile) para um componente (ex.: `PatientNotificationsCard`)
- Ajustar layout para reduzir altura (evitar itens “um abaixo do outro” ocupando muito espaço)
- Manter mensagem clínica: **constância** e **presença** como compromisso do processo terapêutico

## Commit sugerido
`refactor(paciente): extrair contrato, mantra e identificação em componentes`
