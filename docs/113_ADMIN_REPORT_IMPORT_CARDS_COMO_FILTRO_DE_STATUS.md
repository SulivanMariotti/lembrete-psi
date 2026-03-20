# 113_ADMIN_REPORT_IMPORT_CARDS_COMO_FILTRO_DE_STATUS

## Objetivo
Adicionar filtro rápido por tipo de status/erro na lista linha a linha da aba `/admin/report` > `Importação`, usando os cards de contagem do lote como atalhos clicáveis.

## O que mudou
- Os cards **Linhas prontas** e **Linhas com atenção** no resumo do lote agora funcionam como filtro.
- Os cards de contagem por status na seção **Leitura da planilha • linha a linha** agora funcionam como filtro específico.
- Os cards de inconsistência do resumo operacional (ex.: `Sem Demanda/Tags no arquivo`, `Demanda da planilha não encontrada`) também filtram a tabela.
- Foi adicionado um aviso visual quando existe um filtro específico ativo.
- Foi adicionada a ação **Limpar filtro específico**.
- O filtro específico por status/erro passou a ser salvo na sessão, junto com filtro rápido e ordenação.

## Regra de UX
- Clique em um card para filtrar a tabela por aquele status.
- Clique no mesmo card novamente para remover o filtro específico.
- `Linhas prontas` ativa filtro por `ready`.
- `Linhas com atenção` ativa o filtro agregador de linhas não prontas.
- Cards de inconsistência ativam o filtro exato do status correspondente.

## Como validar
1. Abrir `/admin/report`.
2. Ir na aba `Importação`.
3. Analisar uma planilha com linhas prontas e linhas com inconsistências.
4. Clicar nos cards do resumo do lote e validar:
   - `Linhas prontas` mostra apenas linhas `ready`
   - `Linhas com atenção` mostra apenas linhas não prontas
5. Clicar nos cards de inconsistência e validar:
   - a tabela mostra apenas o tipo de erro clicado
6. Conferir o banner:
   - `Filtro específico ativo`
7. Clicar em `Limpar filtro específico`.
8. Recarregar a página na mesma sessão e confirmar que o filtro específico continua salvo.

## Arquivos impactados
- `src/components/Admin/report-import/ReportImportFlowPanel.js`
- `docs/113_ADMIN_REPORT_IMPORT_CARDS_COMO_FILTRO_DE_STATUS.md`
