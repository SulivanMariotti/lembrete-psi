# Prompt para novo chat — Continuidade do Lembrete Psi (a partir de 2026-02-13)

Estamos no projeto **Lembrete Psi** (Next.js + Firebase). Objetivo do produto: sustentar vínculo terapêutico e reduzir faltas com lembretes + psicoeducação + responsabilização.

## Contexto do que foi feito
Refatoração do Painel do Paciente para crescer com segurança:
- Arquitetura **feature-based**: tudo do paciente em `src/features/patient/...`
- Steps concluídos:
  - 9.1: extrair utilitários (phone/dates/ics)
  - 9.2: extrair lógica de dados em hooks (agenda/notas/push/lastSync)
  - 9.3: quebrar UI em componentes:
    - Skeleton, Header, NextSessionCard, NotificationStatusCard, PatientAgendaCard, PatientNotesCard, **ContractStatusCard**
- Hotfixes aplicados para corrigir erros de parsing do Next/Turbopack no `PatientFlow.js` (inclui import duplicado).

## Onde paramos
Próximo passo é **Step 9.3.10**:
- ajustar identificação do paciente no topo (nome/saudação) e remover duplicidades com o card de perfil;
- revisar layout mobile para não ocupar espaço demais no topo do painel.

## Regras do meu fluxo
- Passo a passo (1 por 1). Só avanço quando eu disser “ok”.
- Quando houver mudança de arquivo, entregar **arquivo completo** e preferir **link de download** (sem colar linha a linha).
- Se faltar contexto/arquivo, pedir upload do ZIP mais atual.

## O que quero como entrega no Step 9.3.10
- Header/Top do painel exibindo o nome do paciente com clareza (sem duplicidade).
- Ajustes de layout mobile (prioridade: “Próxima Sessão” e “Agenda” continuarem visíveis sem scroll excessivo).
- Lista de arquivos alterados + commit em português.
