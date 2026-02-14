# Lembrete Psi — Atualização (2026-02-13)

## Contexto
Hoje seguimos a evolução do projeto com foco em duas frentes:
1) **Refatoração/UX do Painel do Paciente** (mobile-first e modular)
2) Preparação do **próximo passo**: Capacitor para APP **sem perder** a versão WEB

## O que foi feito (Painel do Paciente)
- Componentização em `src/features/patient/components/`:
  - Contrato: `ContractStatusCard`
  - Mantra/psicoeducação: `PatientMantraCard`
  - Notificações compacto: `PatientNotificationsCard`
  - Sessões/Agenda: `PatientSessionsCard`
  - Estados: `InlineLoading`, `EmptyState`, `InlineError`
- Mobile compacto (menos scroll)
- “Seu Próximo Atendimento” com **destaque sutil** + layout revisado para legibilidade no celular

## Backlog
- Item 1 (Presença/Faltas Admin) marcado como **[x] concluído** em `02_BACKLOG.md` e `03_BACKLOG.md`.

## Próximo passo (Capacitor mantendo WEB)
Decisão: **Opção A (recomendada)** — app como shell nativo apontando para a URL do Vercel.
- WEB via browser continua
- APP Android/iOS abre a mesma URL (WebView)
- Mantém SSR e rotas `/api`

➡️ Guia em `14_NEXT_STEP_CAPACITOR.md`
