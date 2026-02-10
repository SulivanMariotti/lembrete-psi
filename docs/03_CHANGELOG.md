# Changelog

## 2026-02-10
- Fix: removeu `permission-denied` no painel do paciente ao entrar.
- Causa: `onSnapshot` em `subscribers/{phoneCanonical}` quando o doc não existia; regras antigas dependiam de `resource.data.email` (resource null), gerando `permission-denied`.
- Solução: Firestore Rules permitem o paciente ler (mesmo se não existir) e criar/atualizar apenas o próprio documento em `subscribers/{phoneCanonical}`; mantém admin-only para os demais documentos.
- Arquivo: `/firestore.rules`
- Teste: logout → login paciente → abrir painel → sem erros no console.

- Melhoria (segurança operacional): bloqueio server-side de envios para pacientes inativos.
- Solução: endpoints de envio consultam `users` e bloqueiam se paciente não estiver ativo (status/flags/deletedAt).
- Arquivos:
  - `src/app/api/admin/reminders/send/route.js`
  - `src/app/api/admin/attendance/send-followups/route.js`
- Retorno: endpoints contabilizam bloqueios (`blockedInactivePatient`, etc.).

- Refactor (Agenda): simplificação do botão “Sincronizar”.
- Causa: havia duplicidade de reconciliação (cancelamento de futuros removidos do upload) e risco de `where in` exceder limite (10).
- Solução: manter uma única reconciliação via `cancelMissingFutureAppointments` (chunk em 10) e remover rotina redundante.
- Arquivo:
  - `src/components/Admin/AdminScheduleTab.js`
- Comportamento: sessões futuras removidas do upload são marcadas como `cancelled` com `cancelReason:"removed_from_upload"` (mantém histórico).

- Docs: documentação do comportamento oficial do “Sincronizar” e do cálculo da “Taxa de comparecimento”.
- Arquivo:
  - `docs/07_FLUXOS_E_DISPAROS.md`
