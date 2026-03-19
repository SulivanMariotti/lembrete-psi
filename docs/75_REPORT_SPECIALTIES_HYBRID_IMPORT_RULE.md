# 75 — Regra híbrida de importação por Especialidade

## Objetivo
Trocar a lógica antiga baseada em `Tags -> Demanda` por uma resolução híbrida guiada pela coluna **Especialidade** da planilha.

## Regra consolidada
1. O sistema lê primeiro a coluna `Especialidade`.
2. A Especialidade decide **de onde vem a Demanda**:
   - `excel`: lê a Demanda do arquivo
   - `system_default`: ignora a Demanda do arquivo e usa a Demanda padrão cadastrada no sistema
3. Depois de resolver a Demanda, o sistema preenche:
   - CID por idade (`cidInf` / `cidAdult`)
   - Categoria escolhida no lote

## Comportamento esperado
### Psicologia
- configurada como `excel`
- lê a coluna `Demanda` quando existir
- se a coluna `Demanda` não existir, usa `Tags` como fallback compatível
- valida a Demanda **dentro da Especialidade**

### Nutrição / Fonoaudiologia
- configuradas como `system_default`
- ignoram a Demanda do arquivo
- usam `defaultDemandId` da Especialidade

## Status novos na análise
- `missing-specialty`
- `specialty-not-found`
- `inactive-specialty`
- `psychology-missing-demand`
- `psychology-demand-not-found`
- `specialty-without-default-demand`
- `inactive-demand`
- `missing-category`
- `ready`

## Observações do MVP
- Mantivemos CID e categorias dentro do documento da Demanda para evitar regressão no PDF e no preview.
- O preview já recebe a Demanda resolvida, o CID e a Especialidade reconhecida.
- O motor do PDF continua renderizando apenas linhas com `categoryStatus = ready`.
