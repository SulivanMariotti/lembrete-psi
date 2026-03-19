# 87 — Pacote 1 do /admin/report: validação rígida do template e melhoria do preview

## Objetivo
Este pacote estabiliza a entrada do lote e melhora a leitura operacional do preview. Ele entrega:
- bloqueio de template inválido
- contrato oficial `Demanda -> Tags`
- tratamento correto de erro nas rotas de import e PDF
- melhoria do preview com CID resolvido e origem da Demanda
- ajuste dos textos da UI

## Problema anterior
Antes deste pacote:
- cabeçalho inválido não bloqueava a análise
- import e PDF podiam tratar erro de template como falha genérica
- a UI não mostrava um erro específico de template
- o preview explicava pouco os motivos das falhas
- a página `/admin/report` ainda ensinava uma regra antiga centrada só em `Tags`

## Arquivos alterados
- `src/lib/shared/reportImportTemplate.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/app/api/admin/report/import/route.js`
- `src/app/api/admin/report/pdf/route.js`
- `src/components/Admin/AdminReportImportView.js`
- `src/app/admin/report/page.js`

## Comportamento novo
- Template inválido agora bloqueia a importação.
- Template inválido agora bloqueia a geração de PDF com erro controlado.
- Psicologia continua usando `Demanda` com fallback em `Tags`.
- Nutrição e Fonoaudiologia continuam usando a Demanda padrão do sistema.
- O preview passa a mostrar melhor a origem da Demanda e o CID resolvido.
- A UI passa a comunicar a regra correta do módulo.

## O que ficou fora deste pacote
- snapshot único entre preview e PDF
- remoção do legado `report_demands`
- otimização de leitura/N+1
- refatoração estrutural maior do fluxo

## Checklist de validação
- template inválido bloqueia import
- template inválido bloqueia PDF
- Psicologia resolve por `Demanda` ou `Tags`
- Nutrição/Fonoaudiologia usam o sistema
- CID e Categoria vêm do sistema
- o preview mostra melhor os motivos de falha
- a UI comunica a regra correta

## Risco mitigado
- reduz preview enganoso
- reduz erro operacional ao tratar arquivo fora do template
- reduz ambiguidade sobre origem de Demanda, CID e Categoria
