# 95_ADMIN_REPORT_MODULO_CONSOLIDADO

## Visão geral
O módulo `/admin/report` foi estabilizado para operar no fluxo:

**Importação → Preview congelado → `importSessionId` → PDF**

O comportamento funcional atual é:
- regra clínica centralizada no backend
- preview e PDF baseados no mesmo snapshot
- sessão isolada por admin
- retenção temporária curta
- UI separada por domínios principais

---

## Regra oficial por especialidade

### Fluxo
**Especialidade → regra da Especialidade → Demanda resolvida → CID do sistema → Categoria do sistema**

### Psicologia
- fonte oficial da Demanda: `Demanda`
- fallback: `Tags`
- modo: `EXCEL`

### Nutrição e Fonoaudiologia
- ignoram Demanda da planilha como fonte oficial
- usam a Demanda padrão cadastrada na Especialidade
- modo: `SYSTEM_DEFAULT`

### CID e Categoria
- derivados pelo sistema
- não copiados diretamente da planilha como regra final

---

## Arquitetura atual

### Backend
- `src/lib/server/reportImportAnalysis.js`
  - parsing do `.xlsx`
  - validação do template
  - carregamento do catálogo
  - resolução das linhas
  - `matchSummary`
- `src/lib/server/reportImportSessions.js`
  - snapshot temporário
  - TTL
  - posse por admin
  - cleanup
- `src/lib/server/reportPdfBuilder.js`
  - construção do PDF a partir de `readyRows`

### Rotas
- `POST /api/admin/report/import`
- `POST /api/admin/report/pdf`
- `POST /api/admin/report/import/cleanup`
- CRUD de especialidades e demandas por especialidade
- CRUD de modelos

### Frontend
- `src/components/Admin/AdminReportImportView.js`
  - casca/orquestrador
- `src/components/Admin/report-import/ReportImportFlowPanel.js`
- `src/components/Admin/report-import/ReportSpecialtiesPanel.js`
- `src/components/Admin/report-import/ReportTemplatesPanel.js`

---

## Segurança e operação

### Autorização
Todas as rotas do módulo devem exigir admin autenticado.

### Sessão de import
Cada snapshot:
- pertence ao admin que criou
- expira em 30 minutos
- só pode gerar PDF enquanto válida

### Rate limit
As rotas críticas de admin/report seguem bucket próprio por operação.

### Auditoria
Import, PDF e cleanup geram trilha mínima em audit log.

---

## Catálogo de Especialidades/Demandas

### Caminho principal
- `collectionGroup("demands")`

### Cache
- cache curto em memória
- TTL: `15 segundos`

### Fallback atual
- leitura tradicional por subcoleção
- controlada por:
  - `REPORT_IMPORT_ALLOW_LEGACY_CATALOG_FALLBACK`

### Decisão operacional atual
Manter o fallback ativo por segurança até confirmar estabilidade do caminho principal em produção.

---

## Snapshots e limpeza

### Snapshot
Salva:
- `summary`
- `matchSummary`
- `previewRows`
- `readyRows`
- `selectedTemplate`
- `assumptions`

### Cleanup
- oportunístico na criação de sessão
- manual por endpoint admin
- rotina recomendada:
  - 1x por dia útil
  - ou antes de rodada grande de importações

---

## Testes atuais
Cobertura mínima automatizada adicionada para:
- regra oficial do import
- resumo de status
- posse/expiração da sessão
- rota de import com template inválido
- rota de PDF com sessão proibida
- rota de cleanup

Comando:
```bash
npm run test:report-admin
```

---

## Pendências conscientes
1. Rodar validação com Firebase/Auth/Firestore reais
2. Medir em produção o comportamento do `collectionGroup("demands")`
3. Desligar e depois remover o fallback legado
4. Expandir cobertura automatizada para CRUD de especialidades/modelos

---

## Checklist de retomada
- conferir se o fallback legado ainda precisa ficar ativo
- conferir se cleanup manual está sendo executado conforme rotina
- rodar `npm run test:report-admin`
- validar import → preview → PDF com uma planilha conhecida


## Documentos de homologação e aceite
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
  - checklist funcional e operacional da rodada de homologação
- `docs/97_ADMIN_REPORT_ACEITE_OPERACIONAL.md`
  - critérios formais de aceite para entrada controlada em produção
