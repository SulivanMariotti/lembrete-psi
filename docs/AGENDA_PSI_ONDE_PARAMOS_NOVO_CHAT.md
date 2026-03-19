# AgendaPsi / Módulo de Relatórios — Onde paramos

## 1) Objetivo do trabalho até aqui
Estruturar e evoluir o módulo **`/admin/report`** dentro da base atual para permitir:

- importação de planilha `.xlsx`
- cadastro de **Demandas**
- cadastro de **Categorias por Demanda**
- vínculo automático `Tags da planilha -> Demanda`
- montagem de **Modelo de Relatório**
- geração de **PDF**
- regras dinâmicas como **CID por idade**
- layout com **2 relatórios por página**

> Observação importante: a base usada foi o projeto enviado em `lembrete-psi.zip`, mas as decisões abaixo devem ser tratadas como referência/documentação do **AgendaPsi** e consolidadas no novo chat sem misturar com o outro projeto.

---

## 2) Estado atual consolidado

### Já existe no módulo `/admin/report`
- rota **`/admin/report`**
- upload/importação da planilha base
- leitura/validação da estrutura da planilha
- preview de linhas importadas
- cadastro de **Demandas**
- **5 categorias** por Demanda
- vínculo automático:
  - `Tags` da planilha -> nome da Demanda cadastrada
- seleção da **categoria do lote**
- cadastro de **Modelo de Relatório**
- editor livre com **TAGS**
- geração de **PDF**
- opção de **logo**
- PDF em:
  - **A4 paisagem**
  - **2 relatórios por página**
  - **lado a lado**
- regra de **CID automático por idade**
- tratamento da **data de nascimento** para exibir só a data

### Ajustes já feitos ao longo do caminho
- correção de import quebrado por arquivo faltando
- correção de acentuação no PDF
- correção de texto branco no PDF
- remoção da caixa lateral de metadados
- suavização da borda do relatório
- ajuste do cabeçalho e rodapé
- correções de `id`/edição/exclusão em Demandas
- troca da grade aberta de TAGS por seletor/dropdown

---

## 3) Requisitos consolidados

## Épico A — Importação da planilha
### Funcionalidade
Importar arquivo Excel para servir de base da geração do relatório.

### Regras de negócio
- a planilha é enviada em `/admin/report`
- o sistema lê a aba/estrutura base esperada
- o sistema prepara os registros para preview e geração de PDF
- o campo **`Tags`** da planilha é usado para localizar a Demanda cadastrada

### Critérios de aceitação
- arquivo `.xlsx` é aceito
- preview mostra os dados importados
- `Tags` é lido por linha
- a linha consegue localizar a Demanda correspondente

### Status
**Implementado**

---

## Épico B — Cadastro de Demandas
### Funcionalidade
Cadastrar e manter Demandas usadas na geração do relatório.

### Estrutura atual da Demanda
- nome
- status ativo/inativo
- descrição geral
- categoria 1
- categoria 2
- categoria 3
- categoria 4
- categoria 5
- **CID Inf**
- **CID Adult**

### Regras de negócio
- o nome da Demanda deve bater com o valor de `Tags`
- a categoria escolhida no lote define qual categoria será usada
- Demanda inativa não deve ser usada normalmente em novos relatórios
- o relatório pode usar conteúdo da Demanda e da categoria escolhida

### Critérios de aceitação
- criar, editar e excluir Demanda
- salvar 5 categorias por Demanda
- salvar CID infantil e adulto
- linha importada consegue localizar a Demanda correspondente

### Status
**Implementado**, com necessidade de revisão fina de UX se necessário

---

## Épico C — CID automático por idade
### Funcionalidade
Resolver apenas uma TAG `{{cid}}` no relatório, com lógica automática baseada na idade.

### Regra de negócio final
- cada Demanda tem:
  - `cidInf`
  - `cidAdult`
- no relatório o usuário usa apenas:
  - `{{cid}}`

### Regra de decisão
- idade **< 18** -> usar `CID Inf`
- idade **>= 18** -> usar `CID Adult`
- **sem data de nascimento** ou **data inválida** -> usar **CID Adult** por padrão

### Fonte da idade
- `data_nascimento` da planilha

### Critérios de aceitação
- `{{cid}}` resolve corretamente no preview e no PDF
- menor de 18 usa CID infantil
- adulto usa CID adulto
- sem data válida usa CID adulto

### Status
**Implementado**

---

## Épico D — Data de nascimento
### Funcionalidade
Exibir apenas a data de nascimento, sem idade textual que vem junto da planilha.

### Regra de negócio
Se a planilha vier com algo como:
- `14/09/2012 - 13 anos 6 meses`
- `14/09/2012 13 anos 6 meses`

o sistema deve exibir apenas:
- `14/09/2012`

### Critérios de aceitação
- `{{data_nascimento}}` mostra só a data
- a lógica do CID continua funcionando

### Status
**Implementado**

---

## Épico E — Modelo de Relatório
### Funcionalidade
Montar o relatório com texto livre + TAGS, para o usuário controlar ordem e conteúdo.

### Regras de negócio
O modelo tem:
- cabeçalho
- corpo
- rodapé

O usuário escreve livremente e insere TAGS como:
- `{{paciente}}`
- `{{profissional}}`
- `{{convenio}}`
- `{{categoria_conteudo}}`
- `{{cid}}`

A ordem final do PDF é a ordem do texto escrito no editor.

### Critérios de aceitação
- editor salva cabeçalho, corpo e rodapé
- TAGS são inseridas no ponto desejado
- preview e PDF respeitam a ordem escrita

### Status
**Implementado**, porém a UX ainda pode melhorar

---

## Épico F — Geração de PDF
### Funcionalidade
Gerar PDF final a partir da planilha + Demanda + categoria escolhida + modelo.

### Regras de negócio
- página em **A4 paisagem**
- **2 relatórios por página**
- **lado a lado**
- logo opcional
- cabeçalho, corpo e rodapé por modelo
- a categoria escolhida vale para o lote inteiro
- cada linha usa a categoria correspondente da sua própria Demanda

### Critérios de aceitação
- PDF gerado com duas colunas/blocos por página
- conteúdo aparece com acentuação correta
- logo aparece
- borda suave
- rodapé e cabeçalho respeitam o template

### Status
**Implementado**, ainda com pendências finas de layout/tipografia

---

## 4) Decisões importantes já tomadas

### Decisão 1 — Categoria por lote
Na geração do relatório, o usuário escolhe uma categoria global:
- Categoria 1
- Categoria 2
- Categoria 3
- Categoria 4
- Categoria 5

Cada linha usa:
- a Demanda encontrada por `Tags`
- a categoria escolhida para o lote

### Decisão 2 — Layout do PDF
- A4 paisagem
- 2 relatórios por página
- lado a lado

### Decisão 3 — Modelo por texto livre + TAGS
Foi abandonada a ideia de “selecionar campos e imaginar ordem”.
Agora o modelo é:
- texto livre
- TAGS inseríveis
- controle da ordem pelo próprio usuário

### Decisão 4 — CID automático com fallback
Sem data de nascimento válida:
- usar **CID Adult** por padrão

### Decisão 5 — Data de nascimento
Exibir apenas a data, sem idade textual

---

## 5) TAGS relevantes já previstas

## Planilha
Exemplos de TAGS:
- `{{paciente}}`
- `{{profissional}}`
- `{{data_agendada}}`
- `{{data_criada}}`
- `{{procedimento}}`
- `{{convenio}}`
- `{{plano}}`
- `{{status}}`
- `{{status_secundario}}`
- `{{celular}}`
- `{{telefone}}`
- `{{cidade}}`
- `{{local}}`
- `{{unidade}}`
- `{{origem_agendamento}}`
- `{{tipo_atendimento}}`
- `{{valor}}`
- `{{recebido}}`
- `{{observacao}}`
- `{{motivo_bloqueio}}`
- `{{motivo_cancelamento}}`
- `{{nome_agendou}}`
- `{{tags}}`
- `{{codigo_paciente}}`
- `{{cpf}}`
- `{{data_nascimento}}`
- `{{entrada_paciente}}`
- `{{saida_paciente}}`
- `{{entrada_profissional}}`
- `{{saida_profissional}}`

## Demanda
- `{{demanda_nome}}`
- `{{demanda_descricao}}`
- `{{cid_inf}}`
- `{{cid_adult}}`

## Categoria escolhida
- `{{categoria_titulo}}`
- `{{categoria_conteudo}}`
- `{{categoria_numero}}`

## Campo calculado
- `{{cid}}`

## Sistema
- alguns campos técnicos já existiram no fluxo, mas o ideal é revisar e expor só o necessário no próximo chat

---

## 6) Arquitetura / modelo de dados

## Coleções principais usadas/previstas no módulo
### `report_demands`
Campos relevantes:
- `name`
- `nameNormalized`
- `description`
- `isActive`
- `category1Title`
- `category1Content`
- `category2Title`
- `category2Content`
- `category3Title`
- `category3Content`
- `category4Title`
- `category4Content`
- `category5Title`
- `category5Content`
- `cidInf`
- `cidAdult`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

### `report_templates`
Modelo consolidado atual:
- `name`
- `description`
- `isActive`
- `headerTemplate`
- `bodyTemplate`
- `footerTemplate`
- `logoDataUrl` ou equivalente de logo
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

> Observação: ao longo da evolução, houve fases com estrutura de template por seções/campos. O modelo atual consolidado é **texto livre + TAGS**.

---

## 7) Arquivos centrais do módulo

### Front
- `src/app/admin/report/page.js`
- `src/components/Admin/AdminReportImportView.js`

### APIs
- `src/app/api/admin/report/import/route.js`
- `src/app/api/admin/report/pdf/route.js`
- `src/app/api/admin/report/demands/route.js`
- `src/app/api/admin/report/demands/[id]/route.js`
- `src/app/api/admin/report/templates/route.js`
- `src/app/api/admin/report/templates/[id]/route.js`

### Shared / Server
- `src/lib/server/xlsxLite.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/lib/server/reportPdfBuilder.js`
- `src/lib/server/reportTemplatesStore.js`
- `src/lib/shared/reportImportTemplate.js`
- `src/lib/shared/reportDemands.js`
- `src/lib/shared/reportTemplates.js`

> No novo chat, vale revisar o estado real desses arquivos no repositório antes de continuar, porque houve muitos hotfixes incrementais.

---

## 8) Pendências / atenção imediata

## Pendência 1 — Espaçamento de parágrafo no corpo
Último ponto em aberto reportado pelo usuário:
- ao dar `Enter` ou usar parágrafo, o PDF **ainda não espaça o suficiente**

### Status
Foi tentado ajustar em dois hotfixes, mas o usuário informou que **ainda continua sem espaçar como esperado**.

### Prioridade
**Alta**

---

## Pendência 2 — Rodapé ainda precisa revisão fina
Já houve várias correções de truncamento/markup/posição, mas o rodapé merece revisão única e consolidada.

### O que revisar no novo chat
- renderização linha a linha
- alinhamento central
- preservação de espaços
- redução automática de fonte quando necessário
- distância ideal da base da página

### Prioridade
**Alta**

---

## Pendência 3 — UX do editor de modelo
Já foi melhorado bastante, mas ainda pode ficar mais amigável.

### Melhorias possíveis
- preview mais fiel
- inserção de TAGS mais visual
- favoritos/recentes
- tratamento claro de quebra simples vs parágrafo grande
- formatação mais previsível

### Prioridade
**Média**

---

## Pendência 4 — Revisão geral para consolidar o módulo
Como houve muitos pacotes incrementais, o ideal no novo chat é fazer uma **consolidação técnica**:
- revisar todos os arquivos do módulo
- eliminar código legado de iterações anteriores
- garantir que preview e PDF usam a mesma lógica
- validar CRUD de Demandas e Templates
- validar build completo

### Prioridade
**Alta**

---

## 9) Onde paramos exatamente
Última demanda tratada:
- o usuário reportou que, mesmo dando `Enter` ou usando parágrafo, o PDF **não estava espaçando o suficiente**
- foi gerado um hotfix mais forte para espaçamento de parágrafo
- **não houve validação final do usuário dizendo que resolveu**
- logo, este é o ponto de retomada mais seguro

### Resumo de retomada
**Retomar pela revisão do espaçamento de parágrafo do corpo do relatório**, validando junto:
- quebra simples
- parágrafo
- rodapé
- consistência do renderizador do PDF

---

## 10) Como rodar / testar

## Rodar o projeto
Usar o fluxo normal do projeto atual.

### Conferir
- dependências instaladas
- variáveis de ambiente do Firebase
- acesso admin válido

## Validar o módulo
1. abrir `/admin/report`
2. testar **Demandas**
   - criar
   - editar
   - excluir
3. testar **Modelos**
   - criar
   - editar
   - salvar cabeçalho/corpo/rodapé
   - inserir TAGS
4. importar a planilha
5. escolher categoria do lote
6. gerar PDF

---

## 11) Checklist de validação no novo chat

## CRUD / Base
- Demandas criam/editam/excluem corretamente
- Templates criam/editam/excluem corretamente
- `Tags` encontram a Demanda certa

## Regras
- categoria do lote funciona
- `{{cid}}` resolve corretamente
- sem data de nascimento válida cai em CID Adult
- `{{data_nascimento}}` mostra só a data

## PDF
- A4 paisagem
- 2 relatórios por página
- lado a lado
- logo no cabeçalho
- borda suave
- cabeçalho sem estourar
- rodapé sem truncar
- acentuação correta
- espaçamento de parágrafo satisfatório

---

## 12) Próximos passos recomendados no novo chat

### Passo 1
Revisar e consolidar a renderização do **corpo do PDF**, com foco em:
- quebra simples
- parágrafo
- espaçamento vertical real

### Passo 2
Revisar a rotina de **rodapé** para fechar de vez:
- centralização
- quebra
- espaços
- posição vertical

### Passo 3
Consolidar o módulo `/admin/report` em uma base limpa, reduzindo heranças dos vários hotfixes.

---

## 13) Observação operacional importante
Ao longo da conversa foram gerados muitos `.zip` incrementais.  
No novo chat, o ideal é **não continuar empilhando hotfixes cegamente**.

Melhor abordagem:
- abrir a base atual do projeto
- conferir o estado real do módulo `/admin/report`
- consolidar o que ficou bom
- corrigir o que ainda está instável
- gerar novos pacotes a partir de uma base limpa e consistente


---

## Atualização mais recente — validação por Especialidade e backend de Especialidades

### O que entrou de verdade no código
- `src/lib/shared/reportSpecialties.js`
- rotas novas de Especialidade:
  - `src/app/api/admin/report/specialties/route.js`
  - `src/app/api/admin/report/specialties/[id]/route.js`
  - `src/app/api/admin/report/specialties/[id]/demands/route.js`
  - `src/app/api/admin/report/specialties/[id]/demands/[demandId]/route.js`
- `src/lib/server/reportImportAnalysis.js` agora usa `report_specialties` como fonte principal
- `src/app/api/admin/report/pdf/route.js` com mensagem alinhada à regra nova
- `src/components/Admin/AdminReportImportView.js` com preview/statuses alinhados à validação por Especialidade

### Regra nova consolidada
1. a planilha deve informar **Especialidade**
2. sem Especialidade válida a linha não fica pronta
3. se a Especialidade estiver em modo `excel`, a Demanda vem do arquivo
4. se a Especialidade estiver em modo `system_default`, a Demanda vem do sistema
5. o botão **Gerar PDF** continua liberando somente quando existe ao menos 1 linha `ready`

### Limite atual
A aba principal do Admin ainda está no fluxo antigo de cadastro plano de Demandas.
O núcleo novo já existe no backend/importação/PDF, mas a UI completa de **Especialidade → Demandas** ainda precisa ser virada para as rotas novas.


---

## 8) Último ajuste aplicado
### Correção da aba **Especialidades / Demandas**
Foi corrigido o problema em que a aba nova aparecia no topo, mas ainda renderizava o formulário antigo de **Nova Demanda**.

### O que mudou
- a aba agora mostra o formulário de **Especialidade**
- lista de **Especialidades**
- seleção da Especialidade ativa
- formulário de **Demanda da Especialidade selecionada**
- definição de **Demanda padrão** quando o modo da Especialidade for `system_default`

### Arquivo principal alterado
- `src/components/Admin/AdminReportImportView.js`

### Como validar
- abrir `/admin/report`
- clicar em **Especialidades / Demandas**
- conferir se aparece o bloco **Nova Especialidade**
- selecionar uma Especialidade e conferir se o painel da direita muda para **Demandas da Especialidade**


---

## 9) Último ajuste aplicado
### Merge do layout da Importação com a aba nova de Especialidades / Demandas
Foi corrigida a regressão em que o ajuste visual da aba **Importação** tinha sobrescrito o conteúdo da aba **Especialidades / Demandas**.

### O que ficou valendo
- **Resumo operacional do lote** ocupa largura total
- **Preview da validação** ocupa largura total
- a aba **Especialidades / Demandas** voltou a exibir:
  - formulário de **Nova Especialidade**
  - lista de **Especialidades**
  - formulário de **Demanda da Especialidade selecionada**

### Arquivo principal alterado
- `src/components/Admin/AdminReportImportView.js`

### Como validar
- abrir `/admin/report`
- na aba **Importação**, conferir largura total do resumo e do preview
- na aba **Especialidades / Demandas**, conferir se aparece **Nova Especialidade**
- selecionar uma Especialidade e conferir se a área de Demanda abre à direita
