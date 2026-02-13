# Changelog (patch) — 2026-02-13

## Added
- `ContractStatusCard` (status + texto + aceite do contrato)
- `PatientMantraCard` (cards de psicoeducação/mantra)
- `PatientContactCard` (identificação do paciente)

## Changed
- `PatientFlow` agora compõe os novos componentes ao invés de conter blocos inline.

## Fixed
- Build error por import duplicado do `ContractStatusCard`.
- Build error por módulo não encontrado ao importar `PatientMantraCard`/`PatientContactCard`
  (arquivo ausente no caminho correto ou extensão incorreta).
