<<<<<<< HEAD
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
=======
# Atualização do projeto — 2026-02-13

## O que foi feito
- Finalização da refatoração do painel do paciente:
  - limpeza do `PatientFlow` removendo import morto
  - checklist de validação rápida (smoke checks)

## Por que isso importa
- Import morto e restos de refatoração geram ruído e aumentam chance de regressões
- Smoke checks garantem que o essencial do processo terapêutico não “quebrou”:
  - agenda → presença → contrato → notificações → notas

## Smoke checks (rápido)
1) Contrato pendente: aparece botão “Aceitar contrato” e muda estado após aceitar  
2) Contrato aceito: não exibe botão “Aceitar”  
3) Agenda com sessão futura: “Próximo atendimento” correto  
4) Agenda vazia: estado vazio OK  
5) Notificações on/off: mensagens e CTA corretos  
6) Notas: salvar e persistir após reload
>>>>>>> c66289ccbe833c158649430e3e54b0587f907b5c
