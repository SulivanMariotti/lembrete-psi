# Próximos passos — backlog imediato (a partir do Passo 14)

## Passo 14 — Logs de falha com slot/campanha
Objetivo: falhas não caírem em “Sem slot” no agrupamento do Histórico.
Ações:
- No ponto onde o sistema registra `push_reminder_failed`, incluir:
  - `reminderType` (ex.: `slot1_48h`, `slot2_24h`, `slot3_manha` ou equivalente),
  - e/ou `slot` padronizado (`slot1|slot2|slot3`),
  - e campos auxiliares úteis: `appointmentId`, `patientId`, `phoneCanonical`.
Resultado: agrupamento “Campanhas” fiel e auditável.

## Passo 15 — Histórico server-side (opcional, se crescer muito)
Objetivo: filtros e paginação no servidor (menos payload).
Ações:
- Endpoint com cursor + filtros (período/tipo/status/canal), retornando batches.
- UI consome batches e mantém rolagem interna.

## Passo 16 — Polimento visual final Admin
Objetivo: consistência do Design System.
Ações:
- revisar espaçamentos e tamanhos de chips/badges,
- manter padrão lilás/alertas,
- revisar responsividade.

