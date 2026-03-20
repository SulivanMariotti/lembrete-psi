# 110 — Admin Report Import — Ordenação e cópia de detalhes da lista da planilha

## Objetivo
Melhorar a lista operacional da leitura da planilha em `/admin/report` com:
- ordenação por coluna
- ação de copiar os detalhes completos de uma linha

## O que mudou
### Ordenação por coluna
A tabela da leitura da planilha passou a aceitar ordenação clicando no cabeçalho das colunas:
- Linha
- Paciente / Profissional
- Especialidade
- Demanda lida
- Demanda resolvida
- CID / Categoria
- Status

A ordenação alterna entre crescente e decrescente e fica visível no resumo da própria seção.

### Cópia de detalhes da linha
Cada linha agora oferece ação para copiar os dados operacionais do preview, incluindo:
- número da linha
- status
- detalhe do status
- paciente
- profissional
- especialidade
- Demanda
- Tags
- Demanda resolvida
- origem da resolução
- CID
- categoria
- data/hora
- convênio

Essa ação foi colocada:
- na linha principal da tabela
- dentro da área expandida de detalhes

## Arquivo alterado
- `src/components/Admin/report-import/ReportImportFlowPanel.js`

## Impacto
- melhora triagem operacional
- acelera suporte/manual review
- facilita compartilhar o erro real da linha sem abrir o código
- melhora análise visual de lotes grandes

## Como validar
1. Abrir `/admin/report`
2. Ir na aba Importação
3. Analisar uma planilha com múltiplas linhas
4. Clicar nos cabeçalhos da tabela e validar a mudança da ordenação
5. Usar o botão `Copiar detalhes` em uma linha
6. Colar o conteúdo copiado em um editor e validar se os dados da linha vieram completos
7. Expandir a linha e validar a ação `Copiar tudo`

## Critério de aceite
- a tabela ordena por cabeçalho
- a direção de ordenação alterna
- a ordenação atual fica visível na interface
- a cópia da linha funciona na ação principal
- a cópia da linha funciona também na versão expandida
