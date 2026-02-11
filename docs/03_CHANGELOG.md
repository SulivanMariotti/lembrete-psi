# Changelog

## 2026-02-11
- Fix: Contrato Terapêutico não carregava no painel do paciente.
  - Causa: `globalConfig` era carregado apenas em modo Admin no `useData`.
  - Solução: `globalConfig` passa a carregar também no modo Paciente.
  - Arquivo: `src/hooks/useData.js`

- Fix: Histórico (Admin) com logs novos/legados (createdAt vs sentAt).
  - Solução: fallback de timestamps e ordenação por `sentAt || createdAt`.
  - Arquivos: `src/hooks/useData.js`, `src/components/Admin/AdminHistoryTab.js`

- UX: Histórico com tipos amigáveis (mantém `type` técnico no hover).
  - Arquivo: `src/components/Admin/AdminHistoryTab.js`

- UX: Admin → Pacientes com layout melhor (flags para Cadastro/Notificações) + “Contrato aceito/pendente”.
  - Arquivos: `src/components/Admin/AdminPatientsTab.js`, `src/components/Admin/AdminPanelView.js`, `src/app/api/admin/patients/list/route.js`

- Fix: Notificações do paciente sem `permission-denied`.
  - Causa comum: leitura direta de `subscribers` no client (regras/race conditions).
  - Solução: paciente usa apenas `/api/patient/push/*` para status/registro.
  - Arquivo: `src/components/Patient/PatientFlow.js`

- Fix: Resolver telefone ausente no perfil ao ativar notificações.
  - Solução: `GET /api/patient/resolve-phone` tenta recuperar por email e persistir no `users/{uid}`.
  - Arquivos: `src/app/api/patient/resolve-phone/route.js`, `src/components/Patient/PatientFlow.js`

## 2026-02-10
(Entrada existente no projeto; manter histórico anterior conforme seu repo.)
