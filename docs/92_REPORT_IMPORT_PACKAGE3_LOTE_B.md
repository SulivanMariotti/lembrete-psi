# 92_REPORT_IMPORT_PACKAGE3_LOTE_B

## Objetivo do lote
Refatorar a UI do módulo `/admin/report` sem alterar:
- a regra clínica do backend
- os contratos das rotas `/api/admin/report/*`
- o fluxo funcional `preview -> importSessionId -> PDF`

## Escopo executado
1. Quebra do `AdminReportImportView.js` em painéis funcionais
2. Extração do estado e handlers de importação para hook próprio
3. Extração do estado e handlers de Especialidades/Demandas para hook próprio
4. Extração do estado e handlers de Modelos para hook próprio
5. Extração de helpers visuais/preview para arquivo compartilhado
6. Remoção de código morto do carregamento de `/api/admin/report/demands` que já não era usado no JSX atual

## Estrutura criada

### Componente raiz
- `src/components/Admin/AdminReportImportView.js`
  - agora atua como orquestrador de abas
  - compõe os painéis filhos
  - delega regra de estado para hooks especializados

### Painéis
- `src/components/Admin/report-import/ReportImportFlowPanel.js`
- `src/components/Admin/report-import/ReportSpecialtiesPanel.js`
- `src/components/Admin/report-import/ReportTemplatesPanel.js`

### Hooks
- `src/components/Admin/report-import/hooks/useReportImportFlow.js`
- `src/components/Admin/report-import/hooks/useReportSpecialtiesManager.js`
- `src/components/Admin/report-import/hooks/useReportTemplatesManager.js`

### Compartilhado
- `src/components/Admin/report-import/shared.js`

## Decisões importantes

### 1. Remover o legado de Demanda global da UI
**Decisão:** remover da tela o estado/fluxo de `/api/admin/report/demands` que permanecia carregado, mas sem uso no JSX.

**Por quê:**
- o tab atual já operava com Especialidades e Demandas por Especialidade
- o estado de demanda global era legado morto
- isso aumentava o tamanho do componente sem entregar funcionalidade real

**Impacto:**
- reduz acoplamento
- reduz estados mortos
- elimina consumo desnecessário de rota na abertura da tela

**Como validar:**
- abrir `/admin/report`
- conferir que Importação, Especialidades/Demandas e Modelos continuam funcionando
- confirmar no código que `adminFetch("/api/admin/report/demands")` saiu do componente da tela

### 2. Separar a tela por domínio funcional
**Decisão:** usar painéis independentes por aba e hooks dedicados por domínio.

**Por quê:**
- o problema principal era mistura de responsabilidades
- a regra de negócio já estava protegida no backend
- a tela precisava de isolamento de estado, não só quebra visual

**Impacto:**
- manutenção mais previsível
- menor risco de efeito dominó
- melhoria clara de legibilidade

**Como validar:**
- cada aba deve continuar operando com o mesmo fluxo
- o componente raiz deve apenas orquestrar tabs e passar props

## Contratos preservados
- `/api/admin/report/import`
- `/api/admin/report/pdf`
- `/api/admin/report/specialties`
- `/api/admin/report/specialties/:id/demands`
- `/api/admin/report/templates`

## Cenários de regressão a validar
1. Importar planilha válida e gerar preview congelado
2. Gerar PDF usando `importSessionId`
3. Psicologia com Demanda do arquivo
4. Psicologia usando fallback em `Tags`
5. Nutrição com Demanda padrão do sistema
6. Fonoaudiologia com Demanda padrão do sistema
7. Cadastrar/editar/inativar/excluir Especialidade
8. Cadastrar/editar/inativar/excluir Demanda da Especialidade
9. Definir Demanda padrão em Especialidade `SYSTEM_DEFAULT`
10. Cadastrar/editar/ativar/excluir Modelo
11. Inserir TAG no editor e validar preview renderizado
12. Detectar TAG desconhecida no editor

## Riscos monitorados
- integração silenciosa entre seleção de modelo e preview congelado
- regressão em textarea refs do editor de template
- divergência visual entre preview do modelo e PDF real
- dependência da carga inicial das listas ao trocar de aba

## Resultado esperado do lote
- `AdminReportImportView.js` deixa de ser superarquivo
- cada aba possui módulo próprio
- estado e handlers ficam separados por domínio
- a UI fica pronta para próximos lotes de limpeza fina e testes
