# 78 — Validação do fluxo Especialidade → Demanda

## Objetivo
Fechar a validação funcional do módulo `/admin/report` após a migração para a lógica híbrida por Especialidade.

## O que foi validado nesta etapa
- a UI principal do módulo já consome as novas rotas de `specialties`
- a importação usa `Especialidade` como primeiro nível de decisão
- especialidades no modo `excel` usam `Demanda` do arquivo com fallback em `Tags`
- especialidades no modo `system_default` usam a Demanda padrão cadastrada no sistema
- o PDF continua filtrando apenas linhas com status `ready`

## Correções aplicadas nesta etapa
### 1. Resumo de linhas inválidas
A tela ainda calculava linhas inválidas usando contadores antigos:
- `missingTag`
- `missingDemand`
- `inactiveDemand`
- `missingCategory`

Como a regra nova passou a trabalhar com:
- `missing-specialty`
- `specialty-not-found`
- `inactive-specialty`
- `psychology-missing-demand`
- `psychology-demand-not-found`
- `specialty-without-default-demand`
- `inactive-demand`
- `missing-category`

o resumo precisava deixar de depender dos status antigos.

### Solução adotada
O card de resultado agora calcula:
- `readyRows` com base em `matchSummary.ready`
- `invalidRows` como `previewRows.length - readyRows`

Isso evita divergência visual no resumo enquanto o preview já usa os status novos.

### 2. Texto do cabeçalho da tela
O topo de `AdminReportImportView` ainda comunicava o módulo como se o eixo principal fosse só Demanda.

Foi ajustado para refletir:
- Especialidades
- Importação
- Modelos
- regra híbrida por Especialidade

## Estado atual após a validação
O fluxo está coerente nestes pontos:
1. cadastro de Especialidade
2. cadastro de Demandas dentro da Especialidade
3. importação com leitura de `Especialidade`
4. resolução híbrida da Demanda
5. geração de PDF com linhas `ready`

## Pendência mais importante
Ainda é recomendável revisar visualmente, com arquivo real:
- preview com Psicologia
- preview com Nutrição
- preview com Fonoaudiologia
- seleção de Demanda padrão
- mensagens de erro por Especialidade não encontrada
