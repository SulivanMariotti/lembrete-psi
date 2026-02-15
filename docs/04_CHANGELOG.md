# Changelog
## 2026-02-14
- Fix (Rules): `appointments/*` permite leitura do paciente também por claim `request.auth.token.phoneCanonical` (janela do primeiro acesso pós-pareamento) — remove `permission-denied`.
- Docs: troubleshooting + guia de rules atualizados.

## 2026-02-12
- Feature (Admin / Presença-Faltas): upload de CSV + validação (dryRun) + importação + limpar
- Feature: warnings (não bloqueiam) + detecção de duplicadas no arquivo
- Feature: download “inconsistências (CSV)” (erros + avisos com field/linha/rawLine)
- UX: upload virou botão “Selecionar arquivo” (sem controle nativo do browser)
- Fix (Constância): `/api/admin/attendance/send-followups` agora retorna `sample` no dryRun mesmo com bloqueios e resolve telefone via `users.patientExternalId/patientId`
- Fix: refresh automático do painel após import (sem precisar trocar de menu)

## 2026-02-10
- Fix: removeu `permission-denied` no painel do paciente ao entrar.
- Causa: `onSnapshot` em `subscribers/{phoneCanonical}` quando o doc não existia; regras antigas dependiam de `resource.data.email` (resource null), gerando `permission-denied`.
- Solução: Firestore Rules permitem o paciente ler (mesmo se não existir) e criar/atualizar apenas o próprio documento em `subscribers/{phoneCanonical}`; mantém admin-only para os demais documentos.
- Arquivo: `/firestore.rules`

- Melhoria (segurança operacional): bloqueio server-side de envios para pacientes inativos.
- Solução: endpoints de envio consultam `users` e bloqueiam se paciente não estiver ativo (status/flags/deletedAt).
- Arquivos:
  - `src/app/api/admin/reminders/send/route.js`
  - `src/app/api/admin/attendance/send-followups/route.js`

- Refactor (Agenda): simplificação do botão “Sincronizar”.
- Causa: duplicidade de reconciliação (cancelamento de futuros removidos do upload) e risco de `where in` exceder limite (10).
- Solução: manter uma única reconciliação via `cancelMissingFutureAppointments`.
- Arquivo:
  - `src/components/Admin/AdminScheduleTab.js`

- Feature: mensagens de presença/falta configuráveis no painel Configurações.
- Campos em `config/global`:
  - `attendanceFollowupPresentTitle`, `attendanceFollowupPresentBody`
  - `attendanceFollowupAbsentTitle`, `attendanceFollowupAbsentBody`
- Arquivo UI:
  - `src/components/Admin/AdminConfigTab.js`

- Feature: placeholders e preview com amostras no disparo de Presença/Falta.
- Solução:
  - templates suportam placeholders `{nome}`, `{data}`, `{hora}`, `{profissional}`, `{servico}`, `{local}`, `{id}`
  - compatível com `{{nome}}` (legado)
  - `dryRun` retorna `sample[]` (amostras interpoladas) mesmo quando envio está bloqueado, com `blockedReason`.
- Arquivos:
  - `src/app/api/admin/attendance/send-followups/route.js`
  - `src/components/Admin/AdminAttendanceFollowupsCard.js` (exibe amostras)
- Docs:
  - `docs/07_FLUXOS_E_DISPAROS.md`

- Feature (Presença/Faltas): export “preview normalizado (CSV)” no dryRun (auditoria antes de importar).
- UX: botão “Baixar preview normalizado (CSV)”.

- Feature (Push / Branding): títulos de notificação padronizados para **Permittá • Lembrete Psi** com 💜.
- Feature (Config): títulos de Push configuráveis no **Admin → Configurações** e persistidos em `config/global`:
  - `reminderTitlePrefix`, `reminderTitle1`, `reminderTitle2`, `reminderTitle3`, `reminderTitleDefault`, `reminderTitleMulti`.
- UX: botão “Aplicar padrão Permittá 💜” (preenche títulos de lembretes + presença/falta).
