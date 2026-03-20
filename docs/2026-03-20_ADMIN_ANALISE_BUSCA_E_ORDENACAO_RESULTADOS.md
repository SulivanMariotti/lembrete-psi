# Admin / Análise — busca e ordenação em “5. Resultados encontrados”

## Objetivo
Melhorar a conferência operacional dos grupos encontrados sem reprocessar a planilha.

## O que mudou
A seção **5. Resultados encontrados** passou a ter filtros rápidos locais no frontend:

- busca por **paciente** (nome ou código)
- busca por **profissional** (nome ou código)
- filtro por **especialidade**
- ordenação por:
  - linha da planilha
  - paciente
  - especialidade
  - data/hora

## Decisão
Os filtros são aplicados sobre os grupos já retornados pela análise.

### Por quê
- evita nova chamada ao backend
- mantém a navegação rápida para o Admin
- permite combinar o filtro de tipo já existente com busca textual e ordenação

## Impacto
O Admin pode usar combinações como:

- **Só conflito de profissional** + paciente específico
- **Só duplicidade exata** + especialidade específica
- ordenar por linha para auditoria
- ordenar por paciente/especialidade para conferência operacional

## Como validar
1. Acessar `/admin/analise`
2. Enviar um `.xlsx`
3. Rodar a análise
4. Na seção **5. Resultados encontrados**, validar:
   - busca por paciente
   - busca por profissional
   - filtro por especialidade
   - ordenação por linha, paciente, especialidade e data/hora
5. Confirmar que os resultados mudam sem nova análise do arquivo

## Arquivo alterado neste passo
- `src/components/Admin/AdminAnalysisView.js`

## Validação técnica
- `node --check src/components/Admin/AdminAnalysisView.js`
