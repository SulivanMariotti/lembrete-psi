# Cadastro estruturado de Especialidades e rotas API

## Objetivo
Criar a base estrutural do módulo de relatórios para suportar a hierarquia:

**Especialidade → Demandas**

sem ainda reescrever toda a UI do `/admin/report`.

## Arquivos criados/alterados
- `src/lib/shared/reportSpecialties.js`
- `src/app/api/admin/report/specialties/route.js`
- `src/app/api/admin/report/specialties/[id]/route.js`
- `src/app/api/admin/report/specialties/[id]/demands/route.js`
- `src/app/api/admin/report/specialties/[id]/demands/[demandId]/route.js`

## Coleção nova
### `report_specialties`
Campos principais:
- `name`
- `nameNormalized`
- `description`
- `isActive`
- `demandSourceMode`
  - `excel`
  - `system_default`
- `defaultDemandId`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

## Subcoleção nova
### `report_specialties/{specialtyId}/demands`
Cada Demanda mantém a estrutura atual compatível com o módulo:
- `name`
- `nameNormalized`
- `description`
- `isActive`
- `cidInf`
- `cidAdult`
- `category1Title/category1Content` até `category5Title/category5Content`

## Regras implementadas
### Especialidades
- nome normalizado e id slugificado
- nome único global em `report_specialties`
- `system_default` exige `defaultDemandId`
- exclusão de Especialidade é bloqueada se existirem Demandas vinculadas

### Demandas da Especialidade
- nome único dentro da própria Especialidade
- exclusão da Demanda padrão é bloqueada
- metadados da Especialidade são gravados na Demanda para facilitar rastreio e queries futuras

## Rotas novas
### Especialidades
- `GET /api/admin/report/specialties`
- `POST /api/admin/report/specialties`
- `GET /api/admin/report/specialties/[id]`
- `PATCH /api/admin/report/specialties/[id]`
- `DELETE /api/admin/report/specialties/[id]`

### Demandas dentro da Especialidade
- `GET /api/admin/report/specialties/[id]/demands`
- `POST /api/admin/report/specialties/[id]/demands`
- `PATCH /api/admin/report/specialties/[id]/demands/[demandId]`
- `DELETE /api/admin/report/specialties/[id]/demands/[demandId]`

## Como validar
1. Criar uma Especialidade `Psicologia` com `demandSourceMode = excel`
2. Criar `Nutrição` com `demandSourceMode = system_default`
3. Cadastrar Demanda dentro de `Nutrição`
4. Atualizar `Nutrição` com `defaultDemandId` dessa Demanda
5. Confirmar:
   - listagem de Especialidades com `demandsCount`
   - listagem de Demandas da Especialidade
   - bloqueio ao tentar excluir Especialidade com Demandas
   - bloqueio ao tentar excluir a Demanda padrão

## Próximo passo recomendado
Adaptar a análise da importação para ler `report_specialties` primeiro e só depois resolver a Demanda por:
- Excel, quando `demandSourceMode = excel`
- sistema, quando `demandSourceMode = system_default`
