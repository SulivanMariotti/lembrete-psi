# 54. Relatórios PDF lado a lado + correção do cadastro de Demanda

## Objetivo
Corrigir dois pontos do módulo `/admin/report`:

1. PDF em A4 paisagem com **2 relatórios lado a lado**
2. Cadastro de Demanda com correção do erro de **ID inválido** na edição, mais ação de **excluir Demanda**

## PDF
### Regra aplicada
- Folha A4
- Orientação da página: paisagem
- 2 relatórios por página
- Distribuição: **lado a lado**
- Cada relatório mantém composição vertical

### Observação
A página é horizontal, mas cada bloco individual foi mantido no formato de leitura vertical.

## Cadastro de Demandas
### Correção aplicada
No Next.js 16, os `params` de rotas dinâmicas do App Router são assíncronos. A rota `PATCH /api/admin/report/demands/[id]` passou a resolver `params` com `await` antes de ler o `id`.

### Resultado esperado
- editar uma Demanda e salvar, mesmo sem alterar campos, não deve mais retornar “ID inválido”
- edição passa a validar se a Demanda realmente existe antes de salvar

## Exclusão de Demanda
### API
- `DELETE /api/admin/report/demands/[id]`

### UI
- botão **Excluir** na lista de Demandas
- botão **Excluir Demanda** no formulário quando estiver em edição
- confirmação antes da remoção

## Arquivos principais impactados
- `src/lib/server/reportPdfBuilder.js`
- `src/app/api/admin/report/demands/[id]/route.js`
- `src/components/Admin/AdminReportImportView.js`

## Como validar
1. Acesse `/admin/report`
2. Entre na área **Demandas**
3. Edite uma Demanda existente e clique em salvar sem alterar nada
4. Confirme que não aparece mais “ID inválido”
5. Exclua uma Demanda e confirme atualização da lista
6. Gere um PDF e confira:
   - A4 paisagem
   - 2 relatórios lado a lado
   - cada bloco na vertical
