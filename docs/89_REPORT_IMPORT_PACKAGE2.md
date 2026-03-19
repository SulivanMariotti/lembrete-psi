# 89 — Pacote 2 do /admin/report: snapshot único entre preview e PDF

## Objetivo
Este pacote entrega:
- sessão temporária de importação
- `importSessionId`
- `expiresAt`
- PDF gerado a partir do snapshot
- proteção contra divergência entre preview e PDF

## Problema anterior
- O PDF relia o `.xlsx`.
- Mudança de cadastro entre preview e PDF podia alterar o resultado.
- O preview não era uma referência congelada.

## Arquivos alterados
- `src/lib/server/reportImportAnalysis.js`
- `src/lib/server/reportImportSessions.js`
- `src/app/api/admin/report/import/route.js`
- `src/app/api/admin/report/pdf/route.js`
- `src/components/Admin/AdminReportImportView.js`
- `docs/88_REPORT_IMPORT_SNAPSHOTS.md`
- `docs/89_REPORT_IMPORT_PACKAGE2.md`

## Comportamento novo
- O import cria sessão em `report_import_sessions`.
- A resposta do import inclui `importSessionId`.
- A resposta do import inclui `expiresAt`.
- O PDF recebe apenas `importSessionId`.
- O PDF usa `readyRows` da sessão.
- A geração do PDF registra uso da sessão.

## Códigos de erro novos
- `missing-import-session-id` → HTTP `400`
- `report-import-session-not-found` → HTTP `404`
- `report-import-session-forbidden` → HTTP `403`
- `report-import-session-expired` → HTTP `410`

## O que ficou fora deste pacote
- cleanup do legado `report_demands`
- otimização de leitura N+1
- limpeza automática agendada de snapshots expirados
- refatoração estrutural maior do módulo além do contrato snapshot

## Checklist de validação
- Import cria sessão.
- UI guarda `importSessionId`.
- PDF usa sessão.
- Sessão expirada falha.
- Sessão de outro admin falha.
- Preview e PDF permanecem iguais mesmo após mudança de cadastro.

## Risco mitigado
- Elimina a divergência estrutural entre preview e PDF.
- Reduz retrabalho do parser.
- Melhora previsibilidade operacional.
