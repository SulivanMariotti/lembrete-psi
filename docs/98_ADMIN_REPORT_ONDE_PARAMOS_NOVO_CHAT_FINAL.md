# 98_ADMIN_REPORT_ONDE_PARAMOS_NOVO_CHAT_FINAL

## Objetivo do módulo
O módulo `/admin/report` do AgendaPsi existe para permitir que um admin:
- importe uma planilha `.xlsx`
- valide template e estrutura
- gere um preview confiável
- congele os dados em um snapshot temporário com `importSessionId`
- gere o PDF a partir desse snapshot, sem reprocessar a planilha

O objetivo técnico do trabalho executado foi estabilizar esse fluxo com:
- regra de negócio centralizada
- segurança de borda nas rotas críticas
- redução de acoplamento da UI
- redução de leituras desnecessárias
- limpeza/governança de snapshots
- documentação e testes mínimos do fluxo crítico

---

## Requisitos consolidados

### Épicos
1. Importação e análise de planilha
2. Consolidação da regra clínica por especialidade
3. Geração de PDF baseada em snapshot
4. Limpeza de legado e redução de acoplamento
5. Robustez operacional do backend
6. Estabilização, homologação e aceite

### Funcionalidades
- upload de `.xlsx`
- validação rígida do template
- preview da importação
- geração de `importSessionId`
- geração de PDF via snapshot
- cadastro/edição de especialidades
- cadastro/edição/inativação de demandas por especialidade
- definição de demanda padrão para especialidades `SYSTEM_DEFAULT`
- CRUD de templates do relatório
- cleanup de sessões expiradas
- auditoria e rate limit nas rotas críticas

### Regras de negócio
Fluxo oficial:
**Especialidade → regra da Especialidade → Demanda resolvida → CID do sistema → Categoria do sistema**

#### Especialidades
- **Psicologia**
  - estratégia: `EXCEL`
  - resolve a Demanda pela coluna `Demanda`
  - fallback em `Tags` quando necessário
- **Nutrição**
  - estratégia: `SYSTEM_DEFAULT`
  - usa demanda padrão da especialidade
- **Fonoaudiologia**
  - estratégia: `SYSTEM_DEFAULT`
  - usa demanda padrão da especialidade

#### Regras adicionais
- `CID` e `Categoria` não são fonte oficial da planilha como decisão final
- preview e PDF precisam usar o mesmo snapshot
- o PDF nunca deve reprocessar a planilha original quando houver `importSessionId` válido
- a sessão pertence ao admin que a criou
- sessão expirada deve ser bloqueada
- sessão de outro admin deve ser bloqueada

### Critérios de aceitação
- importação válida gera preview consistente e `importSessionId`
- template inválido é bloqueado com erro claro
- preview e PDF refletem exatamente o mesmo snapshot
- Psicologia respeita `Demanda` com fallback em `Tags`
- Nutrição/Fonoaudiologia usam demanda padrão da especialidade
- auditoria e rate limit existem nas rotas críticas
- cleanup manual de snapshots expirados funciona
- suíte mínima do módulo passa

### Prioridade
- **MVP**: importação, preview, snapshot, PDF, regra oficial, bloqueio por sessão/admin
- **Pós-MVP**: observabilidade ampliada, remoção final do fallback legado do catálogo, evolução de métricas operacionais

### Dependências
- Next.js App Router
- Firebase Auth / Firestore / Storage
- rotas admin protegidas por `requireAdmin`
- utilitários de `rateLimit`, `logAdminAudit`, `adminError`
- templates e especialidades armazenados no Firestore

### Riscos / atenção
- LGPD: retenção curta dos snapshots
- segurança: acesso indevido a `importSessionId`
- consistência: qualquer divergência entre preview e PDF é regressão crítica
- performance: leituras desnecessárias do catálogo de especialidades/demandas
- operação: fallback legado do catálogo ainda está ativo por segurança, mas deve ser observado

---

## O que foi implementado

### Lote A — regra e segurança
Arquivos principais:
- `docs/91_REPORT_IMPORT_PACKAGE3_LOTE_A.md`
- `src/lib/server/reportImportRuleEngine.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/app/api/admin/report/import/route.js`
- `src/lib/server/reportImportSessions.js`
- `src/app/api/admin/report/pdf/route.js`

Entregas:
- regra oficial centralizada no `reportImportRuleEngine.js`
- `reportImportAnalysis.js` virou orquestrador
- rota `/api/admin/report/import` ganhou:
  - `rateLimit`
  - `logAdminAudit`
  - `adminError`
- snapshot recebeu metadata de governança
- PDF alinhado ao snapshot versionado

### Lote B — refatoração da UI
Arquivos principais:
- `docs/92_REPORT_IMPORT_PACKAGE3_LOTE_B.md`
- `src/components/Admin/AdminReportImportView.js`
- `src/components/Admin/report-import/...`

Entregas:
- `AdminReportImportView.js` deixou de ser o superarquivo
- tela quebrada em painéis:
  - `ReportImportFlowPanel`
  - `ReportSpecialtiesPanel`
  - `ReportTemplatesPanel`
- estado extraído para hooks específicos
- helpers compartilhados centralizados
- removido legado morto da UI relacionado ao carregamento antigo de “Demandas globais”

### Lote C — backend operacional
Arquivos principais:
- `docs/93_REPORT_IMPORT_PACKAGE3_LOTE_C.md`
- `src/lib/server/reportImportAnalysis.js`
- `src/lib/server/reportImportSessions.js`
- `src/app/api/admin/report/import/cleanup/route.js`
- rotas de especialidades/demandas

Entregas:
- redução de N+1 no import com `collectionGroup("demands")`
- cache curto do catálogo de import
- fallback seguro para o caminho antigo do catálogo
- invalidação de cache ao alterar especialidades/demandas
- cleanup oportunístico de snapshots expirados
- endpoint admin:
  - `POST /api/admin/report/import/cleanup`
- alinhamento de auditoria/rate limit nas rotas principais

### Lote D — estabilização
Arquivos principais:
- `docs/94_REPORT_IMPORT_PACKAGE3_LOTE_D.md`
- `docs/95_ADMIN_REPORT_MODULO_CONSOLIDADO.md`
- `tests/report-admin/...`

Entregas:
- suíte `npm run test:report-admin`
- harness para resolver alias `@/` nos testes
- política explícita do fallback legado do catálogo
- política explícita de cleanup dos snapshots
- documentação consolidada do módulo

### Pacote final de homologação
Arquivos principais:
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
- `docs/97_ADMIN_REPORT_ACEITE_OPERACIONAL.md`

Entregas:
- checklist formal de homologação
- critérios de aceite operacional
- consolidação do módulo apontando para os documentos de validação

---

## Arquitetura atual do módulo

### Fluxo principal
1. Admin acessa `/admin/report`
2. Seleciona categoria e template
3. Envia arquivo `.xlsx`
4. Rota `/api/admin/report/import` valida o arquivo e chama `analyzeReportImportFile(...)`
5. A análise usa:
   - parser/validação do template
   - catálogo de especialidades/demandas
   - `reportImportRuleEngine.js`
6. O resultado gera preview e snapshot em `reportImportSessions`
7. O frontend recebe `importSessionId`
8. O admin gera PDF via `/api/admin/report/pdf`
9. A rota do PDF lê o snapshot congelado, valida posse/expiração e gera o documento

### Camadas principais
#### UI
- `src/components/Admin/AdminReportImportView.js`
- `src/components/Admin/report-import/ReportImportFlowPanel.js`
- `src/components/Admin/report-import/ReportSpecialtiesPanel.js`
- `src/components/Admin/report-import/ReportTemplatesPanel.js`
- hooks específicos em `src/components/Admin/report-import/hooks/*`

#### Domínio / análise
- `src/lib/server/reportImportAnalysis.js`
- `src/lib/server/reportImportRuleEngine.js`

#### Sessão / snapshot
- `src/lib/server/reportImportSessions.js`

#### Rotas
- `src/app/api/admin/report/import/route.js`
- `src/app/api/admin/report/import/cleanup/route.js`
- `src/app/api/admin/report/pdf/route.js`
- `src/app/api/admin/report/specialties/...`
- `src/app/api/admin/report/templates/...`

---

## Modelo de dados e governança

### Snapshot de import
O snapshot de import deve conter, no mínimo:
- `importSessionId`
- `adminUid`
- `selectedCategory`
- `template` / `selectedTemplate`
- `summary`
- `matchSummary`
- `previewRows`
- `readyRows`
- `assumptions`
- `expiresAt`

Metadata adicionada para governança:
- `snapshotVersion`
- `snapshotSource`
- `snapshotSummary`
- `createdByRole`
- campos relacionados ao PDF gerado

### Política de sessão
- a sessão é temporária
- a sessão pertence ao admin criador
- sessões expiradas devem ser rejeitadas
- existe cleanup oportunístico na criação de nova sessão
- existe cleanup manual por endpoint admin

### Política de catálogo
Estratégia atual:
- principal: `collectionGroup("demands")`
- fallback legado: opcional e controlado por env

Variável:
- `REPORT_IMPORT_ALLOW_LEGACY_CATALOG_FALLBACK`

Decisão atual:
- manter fallback legado **ativo por padrão** durante homologação/observação do ambiente real

---

## Segurança e permissões

### Proteções esperadas
- `requireAdmin` nas rotas do módulo
- `rateLimit` nas rotas críticas
- `logAdminAudit` em ações sensíveis
- `adminError` para padronização de erros inesperados

### Rotas críticas
- `/api/admin/report/import`
- `/api/admin/report/pdf`
- `/api/admin/report/import/cleanup`

### Bloqueios obrigatórios
- sessão inexistente
- sessão expirada
- sessão criada por outro admin
- template inválido na importação
- geração de PDF sem `readyRows`

---

## Testes e validação

### Suíte automatizada
Comando:
```bash
npm run test:report-admin
```

Cobertura mínima adicionada:
- regra oficial do import
- `matchSummary`
- posse/expiração de sessão
- template inválido na rota de import
- sessão de outro admin na rota de PDF
- cleanup de snapshots

### Validação funcional/homologação
Usar:
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
- `docs/97_ADMIN_REPORT_ACEITE_OPERACIONAL.md`

Cenários principais:
- Psicologia com `Demanda`
- Psicologia com fallback em `Tags`
- Nutrição com demanda padrão
- Fonoaudiologia com demanda padrão
- PDF com sessão válida
- PDF com sessão expirada
- PDF com sessão de outro admin
- especialidades/demandas e templates funcionando
- cleanup manual funcionando

---

## Onde paramos de verdade
O módulo `/admin/report` está tecnicamente reorganizado e pronto para:
- homologação controlada
- validação com dados reais
- observação do comportamento em ambiente

A etapa recomendada agora **não é nova refatoração**.  
É executar a homologação e registrar o resultado do aceite operacional.

---

## Pendências abertas
1. Executar a homologação completa com dados reais e registrar o resultado
2. Observar em ambiente se o caminho principal do catálogo com `collectionGroup("demands")` está estável
3. Decidir, após homologação:
   - se o fallback legado pode ser desligado em staging
   - e depois removido em pacote pequeno
4. Conferir logs de auditoria no ambiente real
5. Validar o cleanup manual e decidir se haverá job agendado no futuro
6. Opcional pós-homologação:
   - adicionar observabilidade/métricas do módulo

---

## Próximos passos recomendados
### Próximo passo imediato
Executar a rodada formal usando:
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
- `docs/97_ADMIN_REPORT_ACEITE_OPERACIONAL.md`

### Se a homologação passar
Ordem recomendada:
1. observar fallback legado no ambiente
2. desligar fallback em staging
3. remover fallback em pacote técnico pequeno
4. adicionar observabilidade, se necessário

### Se a homologação apontar falhas
Corrigir apenas o ponto real observado, sem abrir nova refatoração ampla.

---

## Como rodar / testar
### Desenvolvimento
- subir o projeto normalmente
- acessar `/admin/report`

### Testes automatizados
```bash
npm run test:report-admin
```

### Teste funcional principal
1. importar uma planilha válida
2. conferir preview
3. gerar PDF pelo `importSessionId`
4. validar sessão expirada
5. validar sessão de outro admin
6. testar especialidades/demandas
7. testar modelos
8. executar cleanup manual

### Cleanup manual
Endpoint:
```text
POST /api/admin/report/import/cleanup
```

Body opcional:
```json
{ "limit": 25 }
```

---

## Checklist curto de validação para novo chat
- [ ] Entender que a regra oficial já está fechada e não deve ser reaberta sem necessidade
- [ ] Não misturar nova refatoração ampla antes da homologação
- [ ] Tratar preview e PDF como contrato crítico do módulo
- [ ] Respeitar a posse da sessão por admin
- [ ] Considerar o fallback legado do catálogo como proteção temporária
- [ ] Usar os docs 95, 96 e 97 como base operacional
- [ ] Priorizar correção pontual caso a homologação encontre algo

---

## Referências de documentação
- `docs/90_ADMIN_REPORT_ONDE_PARAMOS_NOVO_CHAT.md`
- `docs/91_REPORT_IMPORT_PACKAGE3_LOTE_A.md`
- `docs/92_REPORT_IMPORT_PACKAGE3_LOTE_B.md`
- `docs/93_REPORT_IMPORT_PACKAGE3_LOTE_C.md`
- `docs/94_REPORT_IMPORT_PACKAGE3_LOTE_D.md`
- `docs/95_ADMIN_REPORT_MODULO_CONSOLIDADO.md`
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
- `docs/97_ADMIN_REPORT_ACEITE_OPERACIONAL.md`
