# UI Admin — Especialidades e Demandas por Especialidade

## Objetivo
Adaptar a tela `/admin/report` para o novo eixo de cadastro:

- Especialidade
- Demandas da Especialidade
- CID e Categorias por Demanda

## O que foi implementado
- nova base compartilhada `reportSpecialties.js`
- novas rotas de API:
  - `GET/POST /api/admin/report/specialties`
  - `GET/PATCH/DELETE /api/admin/report/specialties/[id]`
  - `GET/POST /api/admin/report/specialties/[id]/demands`
  - `PATCH/DELETE /api/admin/report/specialties/[id]/demands/[demandId]`
- a aba **Demandas** da UI passou a operar como:
  - formulário de Especialidade
  - lista de Especialidades
  - formulário de Demanda dentro da Especialidade selecionada
  - lista de Demandas da Especialidade selecionada
- definição de **Demanda padrão** quando a Especialidade usa `system_default`

## Regras refletidas na UI
- Especialidade com `excel`:
  - a Demanda do relatório pode vir do arquivo
- Especialidade com `system_default`:
  - a Demanda precisa ser escolhida no sistema
  - a Demanda padrão pode ser definida pela própria tela

## Bloqueios implementados no backend
- não excluir Especialidade com Demandas vinculadas
- não excluir Demanda que está como padrão da Especialidade
- nome de Especialidade único
- nome de Demanda único dentro da Especialidade

## Como validar
1. criar `Psicologia` com regra `excel`
2. criar `Nutrição` com regra `system_default`
3. selecionar uma Especialidade e cadastrar suas Demandas
4. definir a Demanda padrão em `Nutrição`
5. confirmar que a listagem marca a Demanda padrão corretamente
