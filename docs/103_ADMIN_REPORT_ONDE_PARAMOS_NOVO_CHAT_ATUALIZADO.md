# 103_ADMIN_REPORT_ONDE_PARAMOS_NOVO_CHAT_ATUALIZADO.md

## Objetivo do módulo
O módulo `/admin/report` do AgendaPsi centraliza:
- importação de planilha `.xlsx`
- validação rígida do template esperado
- geração de preview congelado por sessão (`importSessionId`)
- geração de PDF a partir do snapshot congelado
- administração de Especialidades / Demandas
- administração de Modelos de relatório

O objetivo do módulo é garantir consistência entre:
**importação → preview → snapshot → PDF**, com regra de negócio clínica centralizada e sem recalcular o lote na hora de emitir o PDF.

---

## Escopo consolidado do módulo
### MVP já consolidado
- upload de planilha `.xlsx`
- validação rígida do template
- preview operacional do lote
- criação de sessão congelada (`importSessionId`)
- geração de PDF baseada em snapshot
- regra oficial por especialidade
- bloqueio de sessão expirada
- bloqueio de sessão de outro admin
- gestão de especialidades e demandas por especialidade
- gestão de modelos/templates
- cleanup manual de sessões expiradas
- auditoria e rate limit nas rotas críticas
- suíte mínima automatizada do fluxo crítico

### Pós-MVP / pendências controladas
- homologação formal do módulo em ambiente real
- observação do fallback legado do catálogo no ambiente
- possível remoção futura do fallback legado
- possível evolução de observabilidade/métricas operacionais

---

## Regra de negócio oficial
Fluxo oficial:
**Especialidade → regra da Especialidade → Demanda resolvida → CID do sistema → Categoria do sistema**

### Especialidades
#### Psicologia
- estratégia: `EXCEL`
- Demanda vem da coluna `Demanda`
- fallback em `Tags`
- se não houver Demanda nem Tags válidas, a linha entra como atenção/pendência

#### Nutrição
- estratégia: `SYSTEM_DEFAULT`
- Demanda oficial não vem da planilha
- o sistema usa a Demanda padrão da especialidade

#### Fonoaudiologia
- estratégia: `SYSTEM_DEFAULT`
- Demanda oficial não vem da planilha
- o sistema usa a Demanda padrão da especialidade

### Regras centrais
- `CID` e `Categoria` não são fonte oficial da planilha
- `CID` e `Categoria` vêm do cadastro da Demanda resolvida
- o PDF deve usar somente o snapshot congelado da sessão
- preview e PDF devem refletir o mesmo conjunto de dados

---

## Arquitetura atual do módulo
### Página
- `src/app/admin/report/page.js`

### Casca da tela admin
- `src/components/Admin/AdminReportImportView.js`

### Aba de Importação
- `src/components/Admin/report-import/ReportImportFlowPanel.js`
- `src/components/Admin/report-import/hooks/useReportImportFlow.js`

### Aba de Especialidades / Demandas
- `src/components/Admin/report-import/ReportSpecialtiesPanel.js`
- `src/components/Admin/report-import/hooks/useReportSpecialtiesManager.js`

### Aba de Modelos
- `src/components/Admin/report-import/ReportTemplatesPanel.js`
- `src/components/Admin/report-import/hooks/useReportTemplatesManager.js`

### Helpers de UI compartilhados
- `src/components/Admin/report-import/shared.js`

### Regra e análise server
- `src/lib/server/reportImportRuleEngine.js`
- `src/lib/server/reportImportAnalysis.js`

### Sessões/snapshots
- `src/lib/server/reportImportSessions.js`

### Rotas principais
- `src/app/api/admin/report/import/route.js`
- `src/app/api/admin/report/import/cleanup/route.js`
- `src/app/api/admin/report/pdf/route.js`
- `src/app/api/admin/report/specialties/route.js`
- `src/app/api/admin/report/specialties/[id]/route.js`
- `src/app/api/admin/report/specialties/[id]/demands/route.js`
- `src/app/api/admin/report/specialties/[id]/demands/[demandId]/route.js`

---

## O que foi feito por lote
### Pacote 1
- validação rígida do template
- melhoria do preview

### Pacote 2
- snapshot entre preview e PDF com `importSessionId`

### Pacote 3 — Lote A
- regra oficial centralizada em `reportImportRuleEngine.js`
- `reportImportAnalysis.js` virou orquestrador
- reforço de segurança na rota `/api/admin/report/import`
- melhoria de governança da sessão/snapshot
- alinhamento leve da rota de PDF
- documentação do lote

### Pacote 3 — Lote B
- desmontagem do superarquivo `AdminReportImportView.js`
- extração por domínio funcional:
  - Importação
  - Especialidades / Demandas
  - Modelos
- remoção de legado morto da UI
- centralização de helpers visuais

### Pacote 3 — Lote C
- redução de N+1 no import com `collectionGroup("demands")`
- fallback seguro para o catálogo legado
- cache curto do catálogo
- invalidação de cache após mutações de especialidades/demandas
- cleanup de snapshots expirados
- rota manual `POST /api/admin/report/import/cleanup`
- fechamento de rate limit / audit / adminError nas rotas principais

### Pacote 3 — Lote D
- suíte mínima automatizada do fluxo crítico
- harness de testes compatível com alias `@/`
- política explícita do fallback legado por env
- política operacional de cleanup exposta
- documentação consolidada do módulo

### Pacote final de homologação
- checklist operacional de homologação
- aceite operacional
- consolidação final da documentação

### Ajustes recentes de layout da aba Importação
#### Ajuste 1
- resumo operacional passou a ocupar largura total

#### Ajuste 2
- refinamento da lateral direita

#### Ajuste 3
- mudança estrutural da aba Importação para fluxo horizontal por faixas:
  1. `Importar planilha e validar lote`
  2. `Operação do preview congelado`
  3. `Resumo operacional do lote`

#### Ajuste 4
- correção de build no `ReportImportFlowPanel.js` após erro de fechamento JSX no layout horizontal

---

## Estado atual da UI da aba Importação
### Estrutura desejada atual
- **Faixa 1:** Importar planilha e validar lote
- **Faixa 2:** Operação do preview congelado
- **Faixa 3:** Resumo operacional do lote

### Motivo da mudança
A sidebar lateral de operação gerava:
- vazio visual entre sessões
- desequilíbrio entre coluna larga e coluna estreita
- pouco aproveitamento do conteúdo da operação, que é mais um painel de status/ação do que uma sidebar real

### Estado atual
- a solução horizontal já foi aplicada
- o build quebrou por erro de JSX e já foi corrigido
- o próximo passo real é **validar visualmente e funcionalmente a versão horizontal no fluxo completo**

---

## Segurança, permissões e governança
### Regras de acesso
- todas as rotas do módulo são administrativas
- acesso via `requireAdmin`
- sessão pertence ao admin criador
- sessão expirada deve ser bloqueada
- sessão de outro admin deve ser bloqueada

### Proteções implementadas
- `rateLimit` nas rotas críticas
- `logAdminAudit`
- `adminError`
- TTL lógico da sessão de importação
- cleanup manual de snapshots expirados
- limpeza oportunística ao criar sessão nova

### Política atual do fallback legado
- estratégia principal: `collectionGroup("demands")`
- fallback legado: habilitado por segurança
- controle por env:
  - `REPORT_IMPORT_ALLOW_LEGACY_CATALOG_FALLBACK=false` para desligar quando quiser testar sem fallback

---

## Modelo de sessão/snapshot
A sessão de importação salva:
- `importSessionId`
- admin dono da sessão
- categoria selecionada
- template selecionado
- `summary`
- `matchSummary`
- `previewRows`
- `readyRows`
- `assumptions`
- metadados de snapshot/governança

### Regras de uso
- o preview usa o resultado da análise
- o PDF usa apenas o snapshot pronto
- não recalcular o lote na geração do PDF
- sessão inválida/expirada/sem posse deve ser rejeitada

---

## Testes e validação existentes
### Suíte automatizada
Comando:
```bash
npm run test:report-admin
```

Cobertura mínima já adicionada para:
- regra oficial do import
- `matchSummary`
- posse e expiração da sessão
- rota de import com template inválido
- rota de PDF com sessão de outro admin
- rota de cleanup

### Validações funcionais esperadas
- importar planilha válida
- preview consistente
- gerar PDF via `importSessionId`
- bloquear sessão expirada
- bloquear sessão de outro admin
- validar Psicologia com `Demanda`
- validar Psicologia com fallback em `Tags`
- validar Nutrição/Fonoaudiologia com `SYSTEM_DEFAULT`

---

## Onde realmente paramos
Paramos após:
1. reorganizar backend, UI e operação do módulo
2. fechar testes mínimos e documentação operacional
3. ajustar a aba Importação para **layout horizontal por faixas**
4. corrigir o erro de build do `ReportImportFlowPanel.js`

### Próximo passo imediato
**Validar a versão horizontal da aba Importação no uso real**, conferindo:
- hierarquia visual
- ausência de “buracos” ou vãos entre sessões
- clareza da faixa `Operação do preview congelado`
- funcionamento de:
  - selecionar categoria
  - selecionar modelo
  - escolher `.xlsx`
  - analisar planilha
  - gerar PDF do lote
- comportamento com:
  - preview pronto
  - sessão ativa
  - resumo carregado
  - erro de template (se possível)

---

## Pendências abertas
### Pendência imediata
- validar visual e funcionalmente o layout horizontal da aba Importação

### Pendências controladas
- homologação formal do módulo com checklist e aceite
- observação em ambiente do fallback legado do catálogo
- decidir se o fallback legado pode ser desligado em staging/homologação depois
- observabilidade/métricas futuras, se necessário

---

## Próximos passos recomendados
### Passo 1
Validar a aba Importação com o layout horizontal no ambiente real

### Passo 2
Se o layout horizontal estiver aprovado:
- consolidar essa versão como estrutura final da aba

### Passo 3
Executar homologação formal usando:
- `docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`
- `docs/97_ADMIN_REPORT_ACEITE_OPERACIONAL.md`

### Passo 4
Após homologação:
- observar o uso do fallback legado
- decidir se vale um pacote pequeno para desligar/remover esse fallback

---

## Como rodar / testar
### Aplicação
```bash
npm install
npm run dev
```

Abrir:
```bash
http://localhost:3000/admin/report
```

### Testes do módulo
```bash
npm run test:report-admin
```

### Cleanup manual
Endpoint admin:
```bash
POST /api/admin/report/import/cleanup
```

Body opcional:
```json
{ "limit": 25 }
```

---

## Checklist curto para retomada em novo chat
- [ ] contexto é do **AgendaPsi**, não do Lembrete Psi
- [ ] módulo em foco: `/admin/report`
- [ ] regra oficial já está consolidada
- [ ] preview e PDF usam snapshot congelado
- [ ] UI foi quebrada por domínio funcional
- [ ] backend já tem cleanup, audit e rate limit
- [ ] suíte `test:report-admin` já existe
- [ ] layout horizontal da aba Importação já foi aplicado
- [ ] build do layout horizontal já foi corrigido
- [ ] próximo passo imediato é validar essa versão horizontal no fluxo real

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
- `docs/98_ADMIN_REPORT_ONDE_PARAMOS_NOVO_CHAT_FINAL.md`
- `docs/99_ADMIN_REPORT_LAYOUT_AJUSTE_IMPORT_RESUMO.md`
- `docs/100_ADMIN_REPORT_LAYOUT_AJUSTE_FINO_COLUNA_DIREITA.md`
- `docs/101_ADMIN_REPORT_LAYOUT_OPERACAO_HORIZONTAL.md`
- `docs/102_ADMIN_REPORT_FIX_LAYOUT_HORIZONTAL_BUILD.md`

---

## Resumo executivo para abrir outro chat
O módulo `/admin/report` já teve:
- regra oficial consolidada
- snapshot entre preview e PDF
- refatoração da UI
- otimização operacional do backend
- cleanup de snapshots
- testes mínimos
- documentação consolidada

O ponto atual não é reescrever regra nem backend.  
O ponto atual é **validar a nova versão horizontal da aba Importação** e, se aprovada, seguir para a homologação formal do módulo.
