# 53. Relatórios em PDF — geração do lote

## Objetivo
Implementar a geração do PDF no módulo `/admin/report`, reutilizando a mesma validação do import e respeitando o layout operacional definido para impressão.

## Regra fechada
- Papel: **A4**
- Orientação da folha: **paisagem**
- Quantidade por página: **2 relatórios**
- Distribuição na folha: **lado a lado**
- Organização de cada relatório: **vertical**
- Categoria escolhida: **global para o lote**
- Fonte da Demanda: campo **Tags** da planilha
- Geração do PDF: **somente com linhas prontas**

## Fluxo
1. Admin escolhe a categoria 1..5
2. Admin importa a planilha `.xlsx`
3. O sistema valida:
   - Tags
   - Demanda
   - Demanda ativa
   - conteúdo da categoria escolhida
4. O botão `Gerar PDF` fica disponível para as linhas com status `Pronto`
5. O endpoint server-side monta o PDF e devolve o arquivo para download

## Rotas
- `POST /api/admin/report/import`
  - faz a pré-análise e devolve preview
- `POST /api/admin/report/pdf`
  - relê a planilha enviada, aplica a categoria escolhida e gera o PDF final

## Arquivos-base
- `src/lib/server/reportImportAnalysis.js`
  - concentra a leitura da planilha e o match com Demandas
- `src/lib/server/reportPdfBuilder.js`
  - monta o PDF sem dependência externa
- `src/components/Admin/AdminReportImportView.js`
  - botão de geração e download do PDF

## Estrutura do PDF
Cada relatório contém, na base atual:
- paciente
- profissional
- data/hora
- procedimento
- convênio
- status
- celular/telefone
- cidade
- origem
- local/unidade
- demanda encontrada
- plano
- título e conteúdo da categoria aplicada
- observações do registro
- rodapé operacional simples

## Regras de segurança
- geração somente para Admin autenticado
- endpoint server-side com `requireAdmin`
- rate limit próprio para geração
- audit log em sucesso e erro

## Comportamento de consistência
- trocar a categoria do lote limpa o preview anterior
- o PDF não usa preview em memória do front
- o servidor relê o arquivo e recalcula o match antes de gerar
- linhas inválidas são puladas do PDF final

## Limites deste passo
- não persiste a planilha
- não gera ZIP de PDFs individuais
- não inclui logo, assinatura, cabeçalho institucional ou campos clínicos adicionais fora do modelo atual
- layout base pronto para refinamento no próximo passo

## Como validar
1. Abrir `/admin/report`
2. Cadastrar Demanda com conteúdo na categoria desejada
3. Importar a planilha
4. Confirmar linhas com status `Pronto`
5. Clicar em `Gerar PDF`
6. Validar:
   - arquivo `.pdf` baixado
   - A4 paisagem
   - 2 relatórios lado a lado por página
   - categoria correta aplicada em cada Demanda
   - linhas sem match fora do PDF
