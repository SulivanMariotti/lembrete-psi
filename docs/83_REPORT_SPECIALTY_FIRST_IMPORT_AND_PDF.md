# AgendaPsi — Importação e PDF com validação por Especialidade

## Objetivo
Trocar a regra principal do módulo `/admin/report` para validar o lote pela coluna **Especialidade**.

## O que foi implementado
- nova base shared em `src/lib/shared/reportSpecialties.js`
- novas rotas:
  - `GET/POST /api/admin/report/specialties`
  - `PATCH/DELETE /api/admin/report/specialties/[id]`
  - `GET/POST /api/admin/report/specialties/[id]/demands`
  - `PATCH/DELETE /api/admin/report/specialties/[id]/demands/[demandId]`
- `reportImportAnalysis.js` agora lê:
  1. `Especialidade`
  2. resolve a Especialidade em `report_specialties`
  3. aplica o modo da Especialidade:
     - `excel` => Demanda do arquivo (`Demanda` ou fallback `Tags`)
     - `system_default` => Demanda padrão da Especialidade
- o PDF continua filtrando somente linhas `ready`, mas a mensagem de erro foi atualizada para a regra nova
- o preview do Admin exibe:
  - Especialidade
  - Demanda usada
  - origem da Demanda
  - status da linha

## Regra consolidada
- `Especialidade` vazia => inconsistência
- `Especialidade` não cadastrada => inconsistência
- `Especialidade` inativa => inconsistência
- `Psicologia` (modo `excel`) exige Demanda no arquivo
- `Nutrição/Fonoaudiologia` (modo `system_default`) podem ter Demanda vazia no arquivo e usam a Demanda padrão do sistema
- categoria vazia na Demanda continua bloqueando a linha

## Status de linha
- `ready`
- `missing-specialty`
- `specialty-not-found`
- `inactive-specialty`
- `psychology-missing-demand`
- `psychology-demand-not-found`
- `specialty-without-default-demand`
- `inactive-demand`
- `missing-category`

## Observação
A UI principal ainda mantém o formulário antigo de Demanda plana. O núcleo novo já está no backend e na importação/PDF.
A próxima etapa recomendada é virar a aba do Admin para consumir as rotas de Especialidades e Demandas aninhadas.
