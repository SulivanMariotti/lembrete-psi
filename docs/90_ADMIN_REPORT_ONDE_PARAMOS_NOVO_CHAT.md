# 90 — ONDE PARAMOS / NOVO CHAT — `/admin/report`

## Objetivo
Retomar o trabalho do módulo `/admin/report` exatamente do ponto em que paramos, sem perder:
- regra de negócio oficial da importação
- escopo já implementado nos Pacotes 1 e 2
- arquitetura atual do fluxo
- pendências priorizadas para a próxima etapa

Este arquivo é a referência de continuidade para um novo chat.

---

## Contexto do módulo
O módulo `/admin/report` é um painel administrativo para:
- cadastrar **Especialidades**
- cadastrar **Demandas por Especialidade**
- cadastrar **Modelos de relatório**
- importar planilhas `.xlsx`
- validar o lote
- gerar PDFs de relatório

O fluxo de negócio foi consolidado para ser guiado por:

**Especialidade -> origem da Demanda -> CID do sistema -> Categoria do sistema**

---

## Requisitos consolidados

### Épico 1 — Cadastro base do domínio
#### Funcionalidades
- cadastro de Especialidades
- cadastro de Demandas por Especialidade
- cadastro de Modelos de relatório

#### Regras de negócio
- cada Especialidade define o modo de origem da Demanda:
  - `EXCEL`
  - `SYSTEM_DEFAULT`
- Demandas pertencem a uma Especialidade
- `CID` e `Categoria` vêm sempre do cadastro da Demanda resolvida no sistema

#### Critérios de aceitação
- admin consegue manter Especialidades, Demandas e Modelos
- especialidade inativa não deve entrar no import
- especialidade `SYSTEM_DEFAULT` precisa ter Demanda padrão válida

---

### Épico 2 — Importação do XLSX
#### Funcionalidades
- upload `.xlsx`
- validação de cabeçalho
- análise por linha
- preview operacional

#### Regras de negócio
- `Tags` continua obrigatória no template
- `Demanda` é opcional e usada como compatibilidade
- para `EXCEL`, a precedência é:
  1. `Demanda`
  2. fallback em `Tags`
- para `SYSTEM_DEFAULT`, a planilha **não define** a Demanda
- `CID` e `Categoria` **não são fonte oficial da planilha**

#### Critérios de aceitação
- template inválido bloqueia o fluxo
- preview mostra motivos de falha por linha/lote
- só linhas `ready` podem seguir para PDF

---

### Épico 3 — Consistência entre preview e PDF
#### Funcionalidades
- snapshot temporário do lote
- `importSessionId`
- expiração controlada
- PDF gerado a partir do snapshot

#### Regras de negócio
- o PDF não relê o `.xlsx`
- o PDF usa apenas o preview congelado
- a sessão pertence ao admin que criou o lote
- sessão expirada não pode gerar PDF

#### Critérios de aceitação
- preview e PDF são exatamente o mesmo lote
- alteração de cadastro depois do preview não muda o PDF daquela sessão
- sessão inexistente, expirada ou de outro admin é bloqueada

---

## Regras oficiais de negócio

### Regra-mãe
**Especialidade -> regra da Especialidade -> Demanda resolvida -> CID do sistema -> Categoria do sistema**

### Padrão funcional por Especialidade
- **Psicologia** = `EXCEL`
- **Nutrição** = `SYSTEM_DEFAULT`
- **Fonoaudiologia** = `SYSTEM_DEFAULT`

### Psicologia
- Especialidade: vem da planilha
- Demanda: vem da planilha (`Demanda` ou fallback `Tags`)
- CID: vem da Demanda cadastrada no sistema
- Categoria: vem da Demanda cadastrada no sistema, conforme a categoria do lote

### Nutrição / Fonoaudiologia
- Especialidade: vem da planilha
- Demanda: vem da Demanda padrão do sistema
- `Tags`/`Demanda` da planilha não definem a Demanda
- CID: vem da Demanda padrão do sistema
- Categoria: vem da Demanda padrão do sistema, conforme a categoria do lote

### Regras que não podem ficar ambíguas
- `Tags` não é a regra única do sistema
- `Demanda` continua opcional no XLSX por compatibilidade
- `CID` não vem da planilha como fonte oficial
- `Categoria` não vem da planilha como fonte oficial

---

## Decisões técnicas já tomadas

### Pacote 1 — já entregue
**Objetivo:** estabilizar a entrada do lote e melhorar o preview.

#### Escopo fechado
- bloquear template inválido no motor
- retornar erro `invalid-template-headers` nas rotas
- manter contrato `Demanda -> Tags`
- melhorar preview com:
  - `CID resolvido`
  - origem da Demanda
  - `matchSummary`
  - erro visual de template
- alinhar os textos da rota `/admin/report`
- documentar:
  - `docs/86_REPORT_IMPORT_RULES.md`
  - `docs/87_REPORT_IMPORT_PACKAGE1.md`

#### Entrega gerada
- `admin-report-package1.zip`

---

### Pacote 2 — já entregue
**Objetivo:** eliminar divergência entre preview e PDF.

#### Escopo fechado
- criar snapshot temporário em `report_import_sessions`
- criar `importSessionId`
- devolver `expiresAt`
- fazer o PDF depender apenas de `importSessionId`
- validar:
  - sessão ausente
  - sessão inexistente
  - sessão expirada
  - sessão de outro admin
  - sessão sem `readyRows`
- documentar:
  - `docs/88_REPORT_IMPORT_SNAPSHOTS.md`
  - `docs/89_REPORT_IMPORT_PACKAGE2.md`

#### Entrega gerada
- `admin-report-package2.zip`

---

## Arquitetura atual consolidada

### Rotas principais
- `src/app/admin/report/page.js`
- `src/components/Admin/AdminReportImportView.js`

### Backend de importação / PDF
- `src/lib/server/reportImportAnalysis.js`
- `src/app/api/admin/report/import/route.js`
- `src/app/api/admin/report/pdf/route.js`
- `src/lib/server/reportImportSessions.js`

### Template do XLSX
- `src/lib/shared/reportImportTemplate.js`

---

## Modelo de dados consolidado

### 1. Especialidades
Coleção:
- `report_specialties`

Campos relevantes:
- `name`
- `normalizedName`
- `active`
- `demandSourceMode`
- `defaultDemandId`

### 2. Demandas por Especialidade
Subcoleção:
- `report_specialties/{specialtyId}/demands`

Campos relevantes:
- `name`
- `normalizedName`
- `active`
- `cidInf`
- `cidAdult`
- `category1` ... `category5` ou estrutura equivalente já existente
- referência implícita de pertencimento à Especialidade

### 3. Modelos de relatório
Coleção/estrutura já existente no módulo de templates.

### 4. Sessões de importação
Coleção:
- `report_import_sessions`

Campos relevantes:
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
- `status`
- `createdAt`
- `updatedAt`
- `expiresAt`
- `pdfGeneratedAt`
- `pdfGeneratedCount`

---

## Status operacionais padronizados
- `ready`
- `missing-specialty`
- `specialty-not-found`
- `inactive-specialty`
- `psychology-missing-demand`
- `psychology-demand-not-found`
- `specialty-without-default-demand`
- `inactive-demand`
- `missing-category`

---

## O que já foi validado conceitualmente
- template inválido deve bloquear antes do preview
- Psicologia usa `Demanda` e fallback em `Tags`
- Nutrição/Fonoaudiologia usam Demanda padrão
- `CID` e `Categoria` vêm do sistema
- preview deve explicar por que o lote falhou
- PDF deve usar snapshot e não o arquivo novamente

---

## Pendências prioritárias

### Pacote 3 — recomendado como próximo passo
#### Prioridade
Alta

#### Objetivo
Limpar legado e consolidar o domínio final do módulo.

#### Escopo recomendado
1. remover legado `report_demands`
2. eliminar carregamentos/handlers mortos em `AdminReportImportView.js`
3. revisar UX residual e nomenclaturas antigas
4. reduzir padrão N+1 no carregamento de Especialidades e Demandas
5. avaliar rotina de limpeza de snapshots expirados
6. revisar auditoria/rate limit em todas as rotas relevantes

#### Por quê
Depois dos Pacotes 1 e 2, o maior risco restante é:
- dívida técnica do fluxo antigo
- complexidade desnecessária no componente principal
- manutenção mais difícil no médio prazo

---

## Riscos / atenção

### Segurança
- todas as rotas `/api/admin/report/*` precisam continuar protegidas por admin
- sessão de importação não pode ser usada por outro admin

### LGPD
- snapshots precisam ter retenção curta
- não guardar arquivo bruto sem necessidade
- evitar persistir dados além do necessário para preview/PDF

### UX
- o operador precisa entender a origem da Demanda
- o operador precisa saber quando a sessão expirou
- a tela não pode ensinar regra antiga

### Performance
- `AdminReportImportView.js` segue grande e com responsabilidades misturadas
- leitura N+1 ainda merece revisão
- snapshot melhora a consistência, mas não resolve sozinho performance estrutural

---

## Onde paramos exatamente
Paramos após:
1. revisão completa do processo `/admin/report`
2. consolidação das regras de negócio
3. planejamento técnico por etapas
4. entrega do **Pacote 1** em `.zip`
5. entrega do **Pacote 2** em `.zip`

O próximo passo recomendado é iniciar o **Pacote 3**.

---

## Próximos passos recomendados

### Próximo passo 1
Revisar e limpar o legado de `report_demands` em:
- `src/components/Admin/AdminReportImportView.js`
- rotas antigas relacionadas, se ainda houver uso real

### Próximo passo 2
Extrair helpers/repositório para leitura de Especialidades + Demandas, reduzindo N+1.

### Próximo passo 3
Definir se haverá limpeza automática de snapshots expirados:
- job agendado
- cleanup oportunístico
- TTL lógico com limpeza posterior

### Próximo passo 4
Revisar o componente principal e, se necessário, quebrar em subcomponentes:
- cadastro
- import
- preview
- templates

---

## Como rodar / testar a partir deste ponto
1. aplicar os arquivos dos pacotes já entregues no repositório
2. subir o projeto em ambiente de teste
3. validar:
   - import inválido
   - import válido com Psicologia
   - import válido com Nutrição/Fonoaudiologia
   - geração de PDF por `importSessionId`
   - expiração e dono da sessão
4. só depois iniciar o Pacote 3

---

## Checklist de validação rápida
- [ ] template inválido bloqueia import
- [ ] template inválido não monta preview
- [ ] Psicologia resolve por `Demanda` ou `Tags`
- [ ] Nutrição/Fonoaudiologia usam Demanda padrão
- [ ] `CID` e `Categoria` vêm do sistema
- [ ] import cria `importSessionId`
- [ ] preview mostra sessão congelada
- [ ] PDF usa `importSessionId`
- [ ] sessão expirada bloqueia PDF
- [ ] sessão de outro admin bloqueia PDF

---

## Prompt-base sugerido para abrir um novo chat
Use este contexto:

> Estamos continuando o trabalho do módulo `/admin/report`.  
> Já concluímos a revisão do processo, fechamos a regra oficial de negócio, e entregamos dois pacotes:
> - Pacote 1: validação rígida do template + melhoria do preview
> - Pacote 2: snapshot único entre preview e PDF com `importSessionId`
>
> Quero continuar a partir do arquivo `docs/90 — ONDE PARAMOS / NOVO CHAT — /admin/report`.
> O próximo passo recomendado é o Pacote 3: limpeza do legado `report_demands`, revisão da UI residual e redução do acoplamento/N+1.
> Trabalhe em 1 passo por vez.

---

## Observação final
Este arquivo foi criado para continuidade em novo chat.  
Ele não substitui as docs dos pacotes já criados (`86`, `87`, `88`, `89`), mas serve como **ponto único de retomada**.
