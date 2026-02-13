# Lembrete Psi — Atualização (2026-02-13)

## Contexto
Seguimos a refatoração do **Painel do Paciente** para uma arquitetura **feature-based** (mais modular e sustentável).

## Objetivo clínico (diretriz do produto)
O painel do paciente segue orientado para **sustentação do vínculo terapêutico**:
1) reforçar constância e compromisso com o horário;
2) reduzir atrito (cuidado ativo);
3) psicoeducar sem moralismo;
4) responsabilizar com acolhimento.

---

## O que foi entregue hoje

### 1) Step 9.3.9 — Contrato / Status do Contrato (componente)
- Criado: `src/features/patient/components/ContractStatusCard.js`
- Ajustado: `src/components/Patient/PatientFlow.js`
  - removeu duplicidade de status do contrato no card de perfil
  - rodapé fixo do contrato passou para dentro do componente
  - adicionou trava de clique (`acceptContractBusy`)

### 2) Step 9.3.10 — Mantra (psicoeducação) (componente)
- Criado: `src/features/patient/components/PatientMantraCard.js`
- Ajustado: `src/components/Patient/PatientFlow.js`
  - removeu lógica antiga do mantra (state + interval + JSX)
  - passou a renderizar `<PatientMantraCard />`

---

## Correções importantes (build)
1) Erro: `Identifier 'ContractStatusCard' has already been declared`
   - causa: import duplicado no `PatientFlow.js`
   - fix: remover linha duplicada
2) Erro: `Module not found: Can't resolve ... PatientMantraCard`
   - causa: arquivo ausente no path ou extensão errada (ex.: `.js.txt`)
   - fix: criar `PatientMantraCard.js` em `src/features/patient/components`

---

## Checklist de validação (rápido)
No painel do paciente:
- [ ] Mantra alterna automaticamente (sem travar UI)
- [ ] Contrato mostra status (Aceito/Pendente) e aceita sem duplo clique
- [ ] Notificações: ativar/estado do token sem erro de permissão
- [ ] Próxima sessão: WhatsApp + ICS funcionam
- [ ] Agenda e Diário continuam funcionando

---

## Próximo passo
### Step 9.3.11 (sugerido) — Extrair “Seu contato” (card do paciente)
- Novo componente: `src/features/patient/components/PatientContactCard.js`
- Objetivo: remover mais JSX e imports do `PatientFlow.js`

---

## Sugestões de commit (PT-BR)
- `refactor(paciente): extrair ContractStatusCard do PatientFlow`
- `refactor(paciente): extrair PatientMantraCard do PatientFlow`
- `fix(paciente): corrigir import duplicado e module-not-found no PatientFlow`
