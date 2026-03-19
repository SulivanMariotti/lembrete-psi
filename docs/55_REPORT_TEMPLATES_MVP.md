# STEP 55 — Modelos de Relatório (MVP)

## Objetivo
Adicionar um cadastro de **Modelo de Relatório** em `/admin/report` para permitir:

- escolher um **modelo** por lote
- manter **cabeçalho fixo**
- manter **rodapé fixo**
- montar o **corpo** por seções
- usar campos vindos de:
  - planilha
  - demanda
  - categoria escolhida
  - sistema
  - texto fixo

## Escopo implementado
### UI
A tela `/admin/report` agora possui 3 áreas:

- **Importação**
- **Demandas**
- **Modelos**

Na aba **Modelos** foi implementado:

- cadastro de modelo
- edição de modelo
- ativação de modelo
- exclusão de modelo
- form com:
  - dados gerais
  - cabeçalho
  - rodapé
  - seções do corpo
  - campos por seção

### API
Novas rotas admin:

- `GET /api/admin/report/templates`
- `POST /api/admin/report/templates`
- `PATCH /api/admin/report/templates/[id]`
- `DELETE /api/admin/report/templates/[id]`

### Firestore
Nova coleção:

- `report_templates`

Campos principais salvos:

- `name`
- `slug`
- `description`
- `isActive`
- `pageFormat`
- `pageOrientation`
- `itemsPerPage`
- `layoutMode`
- `header`
- `footer`
- `sections`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

## Estrutura do modelo
### Header
```json
{
  "showLogo": false,
  "logoPath": "",
  "institutionName": "",
  "line1": "",
  "line2": "",
  "line3": "",
  "reportTitle": "Relatório Clínico",
  "reportSubtitle": ""
}
```

### Footer
```json
{
  "closingText": "",
  "locationText": "",
  "showDate": true,
  "signatureLabel": "",
  "footerNote": ""
}
```

### Sections
Cada seção suporta:

- `id`
- `title`
- `type`
- `order`
- `enabled`
- `fixedText`
- `styleVariant`
- `fields`

Tipos implementados:

- `fields`
- `fixedText`
- `selectedCategory`
- `demand`
- `system`

### Fields
Cada campo suporta:

- `id`
- `label`
- `sourceType`
- `sourceKey`
- `required`
- `fallbackText`
- `fixedText`
- `styleVariant`
- `order`

Origens implementadas:

- `spreadsheet`
- `demand`
- `selectedCategory`
- `fixedText`
- `system`

## Regras de negócio
### Modelo ativo
- o MVP trabalha com **1 modelo ativo por vez**
- ao ativar um modelo, os demais são desativados

### Lote
- na aba **Importação**, o admin pode escolher explicitamente o modelo do lote
- se nenhum for escolhido, o backend tenta usar o **modelo ativo**
- se não existir modelo ativo, o módulo usa o **layout padrão seguro**

### PDF
O gerador de PDF agora reaproveita o modelo escolhido para:

- cabeçalho
- rodapé
- seções do corpo

A paginação permanece fixa do módulo:

- A4
- paisagem
- 2 relatórios por página
- lado a lado

## Catálogo inicial de campos
### Spreadsheet
- paciente
- profissional
- dataHoraAgendada
- dataHoraCriada
- procedimento
- convenio
- plano
- status
- statusSecundario
- celular
- telefone
- cidade
- local
- unidade
- origemAgendamento
- tipoAtendimento
- valor
- recebido
- observacao
- motivoBloqueio
- motivoCancelamento
- nomeAgendou
- tags
- codigoPaciente

### Demand
- name
- description

### Selected Category
- title
- content
- number

### System
- generatedAt
- selectedCategoryNumber
- templateName
- recordIndex
- recordCount

## Validação manual
1. Abrir `/admin/report`
2. Ir para **Modelos**
3. Cadastrar um modelo com:
   - nome
   - cabeçalho
   - rodapé
   - ao menos 1 seção
4. Ativar o modelo
5. Ir para **Importação**
6. Escolher:
   - categoria
   - modelo
   - arquivo `.xlsx`
7. Importar a planilha
8. Gerar o PDF
9. Validar:
   - cabeçalho aplicado
   - rodapé aplicado
   - seções do corpo respeitadas
   - A4 paisagem
   - 2 relatórios lado a lado

## Observações
- upload de logo ainda não foi implementado
- o layout visual do PDF continua com a base técnica atual do módulo
- o ganho deste passo é a **estrutura configurável** do relatório
