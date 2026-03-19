# 82_REPORT_SPECIALTIES_ADMIN_UI

## Objetivo
Adaptar o módulo `/admin/report` para operar no eixo:

- Especialidade
- Demandas da Especialidade
- Demanda padrão quando a regra da Especialidade for `system_default`

## O que mudou
- criada a coleção `report_specialties`
- criadas rotas Admin para CRUD de Especialidades
- criadas rotas Admin para CRUD de Demandas dentro da Especialidade
- a aba antiga de Demandas passou a trabalhar com:
  - formulário/lista de Especialidades
  - formulário/lista de Demandas da Especialidade selecionada

## Regras importantes
- `excel` = a Especialidade espera Demanda vinda do arquivo
- `system_default` = a Especialidade pode usar Demanda padrão do sistema
- não excluir Especialidade com Demandas vinculadas
- não excluir Demanda marcada como padrão da Especialidade

## Arquivos alterados
- `src/lib/shared/reportSpecialties.js`
- `src/app/api/admin/report/specialties/route.js`
- `src/app/api/admin/report/specialties/[id]/route.js`
- `src/app/api/admin/report/specialties/[id]/demands/route.js`
- `src/app/api/admin/report/specialties/[id]/demands/[demandId]/route.js`
- `src/components/Admin/AdminReportImportView.js`
- `src/app/admin/report/page.js`

## Validação recomendada
1. criar `Psicologia` com `excel`
2. criar `Nutrição` com `system_default`
3. selecionar a Especialidade na tela
4. cadastrar Demandas dentro da Especialidade
5. definir Demanda padrão para `system_default`
6. validar bloqueios de exclusão
