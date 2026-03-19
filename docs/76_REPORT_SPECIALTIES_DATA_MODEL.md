# 76 — Modelo de dados MVP para Especialidades do relatório

## Coleção raiz
### `report_specialties`
Campos:
- `name`
- `nameNormalized`
- `description`
- `isActive`
- `demandSourceMode` (`excel` | `system_default`)
- `defaultDemandId`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

## Subcoleção
### `report_specialties/{specialtyId}/demands`
Campos:
- `name`
- `nameNormalized`
- `description`
- `isActive`
- `cidInf`
- `cidAdult`
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
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

## Subcoleção opcional
### `report_specialties/{specialtyId}/aliases`
Campos:
- `label`
- `labelNormalized`
- `isActive`

## Decisão do MVP
Mantivemos a estrutura da Demanda parecida com a coleção antiga `report_demands`, mas agora aninhada dentro da Especialidade.

### Por quê
- reduz retrabalho no preview
- reduz retrabalho no PDF
- permite migração gradual do Admin

## Regras de integridade
- Especialidade com `system_default` precisa de `defaultDemandId`
- Demanda pertence a uma única Especialidade
- Demanda padrão não pode ser excluída sem troca prévia
- Nome da Demanda precisa ser único dentro da Especialidade
