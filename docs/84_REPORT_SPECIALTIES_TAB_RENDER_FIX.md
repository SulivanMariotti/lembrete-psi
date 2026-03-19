# Correção da aba Especialidades / Demandas

## Objetivo
Corrigir a aba **Especialidades / Demandas** no `/admin/report` para que ela deixe de abrir o formulário antigo de **Demanda plana** e passe a exibir o fluxo correto de:

- cadastro de **Especialidade**
- listagem de Especialidades
- seleção da Especialidade ativa
- cadastro de **Demandas dentro da Especialidade**
- definição de **Demanda padrão** quando o modo for `system_default`

## Problema encontrado
A aba já aparecia no topo da tela, mas ao clicar ainda carregava o conteúdo antigo:

- card **Nova Demanda**
- CRUD de Demanda plana
- nenhuma área de Especialidade

Na prática, a aba tinha sido renomeada, mas o `render` ainda apontava para a UI antiga.

## Correção aplicada
No componente `src/components/Admin/AdminReportImportView.js` foram adicionados:

- estados de **Especialidade**
- carga de Especialidades via `/api/admin/report/specialties`
- carga de Demandas da Especialidade via `/api/admin/report/specialties/[id]/demands`
- formulário de **Nova Especialidade / Editar Especialidade**
- lista de Especialidades com ações:
  - Usar
  - Editar
  - Ativar/Inativar
  - Excluir
- formulário de **Nova Demanda** vinculado à Especialidade selecionada
- lista de Demandas da Especialidade selecionada
- ação para definir **Demanda padrão** quando a Especialidade usa `system_default`

## Regras refletidas na UI
- `excel` → a Demanda vem do arquivo
- `system_default` → a Demanda pode vir do sistema
- a Demanda padrão só é exigida quando a Especialidade usa `system_default`

## Como validar
1. Abrir `/admin/report`
2. Clicar em **Especialidades / Demandas**
3. Confirmar que o painel esquerdo mostra:
   - **Nova Especialidade**
   - lista de Especialidades
4. Clicar em **Usar** em uma Especialidade
5. Confirmar que o painel direito mostra:
   - **Nova Demanda • {Especialidade}**
   - lista de Demandas da Especialidade
6. Para uma Especialidade com modo `system_default`, confirmar que existe:
   - seletor de **Demanda padrão**
   - botão **Definir padrão** na lista de Demandas

## Arquivo alterado nesta correção
- `src/components/Admin/AdminReportImportView.js`
