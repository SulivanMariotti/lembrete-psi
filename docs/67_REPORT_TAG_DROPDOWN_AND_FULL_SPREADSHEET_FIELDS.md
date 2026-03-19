# 67 — TAGS em dropdown + catálogo completo da planilha

## Objetivo
Simplificar a inserção de TAGS no editor do modelo de relatório e garantir que todos os campos relevantes da planilha fiquem disponíveis para seleção.

## O que mudou
- A grade aberta de botões foi substituída por um seletor com:
  - origem do campo
  - busca por nome/TAG
  - dropdown de escolha
  - ação explícita de inserir no texto
- O grupo **Planilha** passou a listar o catálogo completo esperado da importação Amplimed.
- A resolução de TAGS da planilha ficou mais robusta:
  - tenta primeiro os campos normalizados já preparados no registro
  - quando necessário, faz fallback para o valor bruto em `sourceRow` pela coluna original da planilha
- O preview do modelo agora preserva `sourceRow`, permitindo testar TAGS adicionais no preview quando a linha de amostra vier da importação.

## Arquivos alterados
- `src/components/Admin/AdminReportImportView.js`
- `src/lib/shared/reportTemplates.js`

## Regras
- A área ativa (Cabeçalho, Corpo ou Rodapé) continua definindo onde a TAG será inserida.
- O dropdown mostra a TAG real no formato `{{campo}}`.
- O catálogo de TAGS continua agrupado por origem:
  - Planilha
  - Demanda
  - Categoria escolhida
  - Sistema

## Como validar
1. Abrir `/admin/report`
2. Ir em **Modelos**
3. Confirmar que a área de TAGS virou um seletor com busca
4. Em **Origem do campo**, escolher **Planilha**
5. Procurar por campos que antes não apareciam, por exemplo:
   - `status_registro`
   - `codigo_profissional`
   - `conselho`
   - `especialidade`
   - `email`
   - `cep`
   - `data_exclusao`
6. Inserir a TAG no corpo do modelo
7. Salvar o modelo
8. Importar a planilha e gerar o PDF
9. Confirmar que a TAG inserida deixa de sair vazia quando houver valor na linha importada

## Observação
O foco deste passo foi melhorar a UX de inserção de campos e ampliar a cobertura das TAGS da planilha, sem mexer na estrutura geral do PDF.
