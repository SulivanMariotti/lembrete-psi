# 88 — Snapshots de importação no módulo de relatórios

## Objetivo
Registrar a regra estrutural do fluxo novo do `/admin/report`:

**importação → snapshot → preview congelado → PDF**

## Problema que o snapshot resolve
Antes deste pacote, o preview era gerado em uma análise e o PDF podia reprocessar o `.xlsx` depois. Isso permitia divergência entre o que o admin viu no preview e o que saiu no PDF, principalmente quando Especialidades, Demandas ou Modelos eram alterados entre as duas ações.

## Regra-mãe
O PDF deve ser gerado a partir do snapshot do preview aprovado, e não por nova leitura do `.xlsx`.

## Fluxo novo
1. O admin importa a planilha.
2. O backend analisa o lote normalmente.
3. O backend cria um `importSessionId`.
4. O backend salva `report_import_sessions/{sessionId}`.
5. O frontend exibe o preview congelado.
6. O PDF usa apenas `importSessionId`.

## Estrutura do snapshot
Campos principais do documento salvo em `report_import_sessions`:
- `sessionId`
- `adminUid`
- `adminEmail`
- `fileName`
- `fileSize`
- `selectedCategory`
- `templateId`
- `selectedTemplate`
- `summary`
- `matchSummary`
- `previewRows`
- `readyRows`
- `assumptions`
- `createdAt`
- `updatedAt`
- `expiresAt`
- `pdfGeneratedAt`
- `pdfGeneratedCount`
- `status`

## Expiração
- TTL padrão: **30 minutos**
- Sessão expirada não pode gerar PDF.
- Sessão expirada exige nova importação.

## Segurança
- O snapshot pertence ao admin que fez a importação.
- Outro admin não pode usar a sessão.
- O PDF só usa `readyRows` da sessão.
- `selectedCategory` e `templateId` não são aceitos do cliente no momento do PDF como fonte de verdade.

## Impacto no frontend
- O frontend guarda `importSessionId`.
- O frontend guarda `expiresAt`.
- O botão de PDF depende de sessão válida.
- O preview comunica que está congelado.

## Impacto no backend
- A rota de import cria a sessão.
- A rota de PDF lê a sessão.
- A rota de PDF não chama mais `analyzeReportImportFile()`.

## Critérios de aceitação
- Import válido retorna `importSessionId`.
- Import válido retorna `expiresAt`.
- PDF com sessão válida gera o mesmo lote do preview.
- Sessão expirada bloqueia o PDF.
- Sessão de outro admin bloqueia o PDF.
- Alteração de cadastro após preview não muda o PDF daquela sessão.
