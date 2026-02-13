# Prompt para novo chat — Continuidade do Lembrete Psi (a partir de 2026-02-13)

Estamos no projeto **Lembrete Psi** (Next.js + Firebase). Objetivo do produto: sustentar vínculo terapêutico e reduzir faltas com lembretes + psicoeducação + responsabilização.

## Contexto do que foi feito
Refatoração do Painel do Paciente para crescer com segurança:
- Arquitetura **feature-based**: tudo do paciente em `src/features/patient/...`
- Steps concluídos:
  - 9.1: extrair utilitários (phone/dates/ics)
  - 9.2: extrair lógica de dados em hooks (agenda/notas/push/lastSync)
  - 9.3: quebrar UI em componentes:
    - Skeleton, Header, NextSessionCard, NotificationStatusCard, PatientAgendaCard, PatientNotesCard
- Hotfixes aplicados para corrigir erros de parsing do Next/Turbopack no `PatientFlow.js`.

## Onde paramos
Próximo passo é **Step 9.3.9**:
- extrair o bloco de **Contrato / Status do Contrato** do `PatientFlow.js` para um componente (ex.: `ContractStatusCard.js`)
- reduzir ainda mais o `PatientFlow` mantendo comportamento idêntico

## Regras do meu fluxo
- Passo a passo (1 por 1). Só avanço quando eu disser “ok”.
- Quando houver mudança de arquivo, entregar **arquivo completo** e preferir **link de download** (sem colar linha a linha).
- Se faltar contexto/arquivo, pedir upload do ZIP mais atual.

## O que quero como entrega no Step 9.3.9
- Novo componente para contrato (UI + mensagens clínicas coerentes: constância, compromisso, responsabilidade).
- `PatientFlow.js` atualizado só para usar o componente.
- Sem quebrar build (Next.js 16.1.6 / Turbopack).
- Lista de arquivos alterados + commit em português.
