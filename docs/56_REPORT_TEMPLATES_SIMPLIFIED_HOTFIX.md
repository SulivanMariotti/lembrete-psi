# 56. Report Templates — simplificação do cadastro e hotfix de IDs

## Objetivo
Corrigir o módulo de **Modelos de Relatório** em `/admin/report` após dois problemas observados:
1. warning de React sobre `key` única em listas
2. botões de **editar/excluir** de Modelos sem efeito prático
3. excesso de complexidade no cadastro do modelo

## Causa raiz
O objeto retornado por `mapTemplateToForm()` não preservava o campo `id`.  
Com isso:
- a listagem de modelos ficava sem `item.id`
- o React recebia chaves inválidas/repetidas
- os botões de editar/excluir não tinham o id correto para chamar a API

## Correção aplicada
### 1) Preservação do ID
`mapTemplateToForm()` agora mantém:
- `id`

### 2) Simplificação do cadastro de Modelo
A UI de Modelos foi reduzida para um fluxo de montagem simples:
- nome
- descrição
- ativo/inativo
- cabeçalho
- rodapé
- seleção de campos do corpo
- texto complementar fixo

### 3) Montagem automática das seções
O sistema agora gera as `sections` automaticamente com base na seleção do admin.

## Estrutura simplificada do corpo
### Dados da planilha
- Paciente
- Profissional
- Data/Hora agendada
- Procedimento
- Convênio
- Status
- Observação
- Tags

### Dados da Demanda
- Nome da Demanda
- Descrição geral da Demanda

### Dados da categoria escolhida
- Título da categoria
- Conteúdo da categoria

### Texto complementar
- bloco fixo opcional

## Compatibilidade
O PDF continua sendo gerado em:
- A4
- paisagem
- 2 relatórios por página
- lado a lado

## Como validar
1. Abrir `/admin/report`
2. Ir em **Modelos**
3. Criar um modelo simples
4. Salvar
5. Editar o mesmo modelo
6. Excluir o modelo
7. Confirmar que:
   - não aparece mais warning de `key`
   - editar abre corretamente
   - excluir remove corretamente
   - a criação do modelo ficou mais simples

## Observação
Os `sections` continuam existindo no backend para manter compatibilidade com o gerador do PDF, mas o admin não precisa mais montá-los manualmente no MVP.
