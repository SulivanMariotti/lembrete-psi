# Files alterados — 2026-02-14

> Lista consolidada por passo para rastreabilidade.

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

### Passo 22 — Remover Admin do Paciente (CTA + menu)
- `src/components/Patient/PatientLogin.js`
- `src/features/patient/components/PatientHeader.js`
- `src/components/Patient/PatientFlow.js`

## Admin

### Passos 11/12/13 — Dashboard + Presença/Faltas
- `src/components/Admin/AdminPanelView.js`
- `src/components/Admin/AdminDashboardTab.js`
- `src/components/Admin/AdminAttendanceTab.js`

### Passo 23 — Menu Admin (branding)
- `src/components/Admin/AdminPanelView.js`

### Passo 22 — Admin em rota dedicada (/admin)
- `src/app/admin/page.js` (novo)
- `src/app/admin/layout.js` (novo)
- `src/app/page.js` (root virou paciente-only)

## Branding (Paciente + Admin)

### Passo 14 — Login logo
- `public/brand/*`
- arquivos do login do paciente (conforme estrutura do projeto)

### Passos 15–20 — skins + refinamentos
- `src/app/globals.css`
- `src/app/page.js`

### Passo 21 — Auditoria de cores (resíduos)
- `src/components/DesignSystem.js`
- `src/components/Admin/AdminPatientsTab.js`

## Documentação

### Passo 7 — Biblioteca de frases
- `docs/35_BIBLIOTECA_DE_FRASES_BASE.md`

### Handoff e atualização
- `docs/36_ATUALIZACAO_2026-02-14.md`
- `docs/39_PROMPT_NOVO_CHAT_2026-02-14.md`
- `docs/40_PASSO_21_AUDITORIA_CORES.md`
- `docs/41_ATUALIZACAO_2026-02-14_PASSO_21.md`
- `docs/42_PASSO_22_ADMIN_EM_ADMIN_ROUTE.md`
- `docs/43_ATUALIZACAO_2026-02-14_PASSO_22.md`
- `docs/44_PASSO_23_MENU_ADMIN_BRANDING.md`
- `docs/45_ATUALIZACAO_2026-02-14_PASSO_23.md`

---

## Observação
Alguns passos alteraram o mesmo arquivo (ex.: `PatientFlow.js`, `PatientHeader.js`, `page.js`). A lista acima mostra os pontos de toque por etapa para facilitar revisão/auditoria.
