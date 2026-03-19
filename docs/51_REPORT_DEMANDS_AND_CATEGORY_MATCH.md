# STEP 51 — Cadastro de Demandas + vínculo por Tags + categoria do lote

## Objetivo
Preparar a rota `/admin/report` para dois fluxos complementares:

1. **Importar a planilha base** e validar o campo `Tags`
2. **Cadastrar Demandas** com 5 categorias para futura geração dos PDFs

> Neste passo ainda **não existe geração final do PDF**. O foco foi deixar o dado operacional pronto e validável.

---

## O que foi implementado

### 1) Cadastro administrativo de Demandas
Coleção Firestore:
- `report_demands`

Campos:
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
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

### 2) APIs Admin
- `GET /api/admin/report/demands`
- `POST /api/admin/report/demands`
- `PATCH /api/admin/report/demands/[id]`

### 3) Vínculo por Tags na importação
Durante a importação do `.xlsx`, o backend:
- lê o campo `Tags`
- normaliza o valor
- procura uma Demanda com `nameNormalized` compatível
- aplica a categoria escolhida no lote

### 4) Categoria escolhida para o lote
No `/admin/report`, o Admin escolhe uma categoria global:
- Categoria 1
- Categoria 2
- Categoria 3
- Categoria 4
- Categoria 5

Regra:
- a categoria é a mesma para o lote inteiro
- o conteúdo varia conforme a Demanda encontrada na linha

Exemplo:
- linha com `Tags = Demanda A` + lote na Categoria 3 → usa `category3*` da Demanda A
- linha com `Tags = Demanda B` + lote na Categoria 3 → usa `category3*` da Demanda B

---

## Estados do preview
Cada linha do preview pode retornar:

- `ready` → Demanda encontrada e categoria preenchida
- `missing-tag` → linha sem `Tags`
- `missing-demand` → `Tags` não encontrou Demanda cadastrada
- `inactive-demand` → Demanda encontrada, mas inativa
- `missing-category` → Demanda existe, mas a categoria escolhida está vazia

---

## Regras operacionais
- somente Admin acessa e altera Demandas
- a planilha **não é persistida** neste passo
- o preview mostra somente a pré-validação do lote
- Demandas inativas continuam existindo para referência, mas não devem gerar novos relatórios válidos
- a correspondência `Tags -> Demanda` usa:
  - trim
  - case-insensitive
  - remoção de acentos
  - normalização de espaços

---

## UX implementada em `/admin/report`
A rota ficou com duas áreas:

### Importação
- upload `.xlsx`
- escolha de categoria do lote
- resumo do arquivo
- resumo do vínculo com Demandas
- preview de até 20 linhas

### Demandas
- cadastro
- edição
- ativar/inativar
- 5 categorias por Demanda
- preview resumido do conteúdo cadastrado

---

## O que fica para o próximo passo
### Geração do PDF
Layout já consolidado, mas ainda não implementado:
- A4
- página em paisagem
- dois relatórios por folha
- cada relatório individual em vertical
- conteúdo composto por dados da planilha + categoria escolhida da Demanda

---

## Como validar
1. Abrir `/admin/report`
2. Entrar como Admin
3. Ir em **Demandas**
4. Cadastrar uma Demanda com nome igual ao valor esperado em `Tags`
5. Preencher pelo menos uma categoria
6. Voltar em **Importação**
7. Escolher a categoria do lote
8. Importar a planilha
9. Confirmar no preview:
   - Demanda vinculada
   - categoria aplicada
   - status `Pronto` quando tudo estiver correto
