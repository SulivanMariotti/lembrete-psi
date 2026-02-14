# Files alterados — 2026-02-14

> Lista consolidada por passo (1–20) para rastreabilidade.

## Paciente

### Passo 1 — Header
- `src/features/patient/components/PatientHeader.js`

### Passo 2 — Próximo atendimento
- `src/features/patient/components/NextSessionCard.js`

### Passo 3 — Contrato (não exibir quando OK)
- `src/components/Patient/PatientFlow.js`

### Passo 4 — Agenda (mobile + remover “Upload: …”)
- `src/features/patient/components/PatientAgendaCard.js`

### Passos 6/8/9/10 — Diário Rápido (layout + histórico + contexto + destaque)
- `src/features/patient/components/PatientNotesCard.js`
- `src/components/Patient/PatientFlow.js` (para passar contexto/uid)

## Admin

### Passos 11/12/13 — Dashboard + Presença/Faltas
- `src/components/Admin/AdminPanelView.js`
- `src/components/Admin/AdminDashboardTab.js`
- `src/components/Admin/AdminAttendanceTab.js`

## Branding (Paciente + Admin)

### Passo 14 — Login logo
- `public/brand/*`
- arquivos do login do paciente (conforme estrutura do projeto)

### Passos 15–20 — skins + refinamentos
- `src/app/globals.css`
- `src/app/page.js`

## Documentação

### Passo 7 — Biblioteca de frases
- `docs/35_BIBLIOTECA_DE_FRASES_BASE.md`

### Handoff e atualização
- `docs/36_ATUALIZACAO_2026-02-14.md`
- `docs/39_PROMPT_NOVO_CHAT_2026-02-14.md`
- `docs/40_PASSO_21_AUDITORIA_CORES.md`

---

## Observação
Alguns passos alteraram o mesmo arquivo (ex.: `PatientNotesCard.js`, `globals.css`). A lista acima mostra os pontos de toque por etapa para facilitar revisão/auditoria.
