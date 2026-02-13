# Changelog (patch) — 2026-02-13

## Added
- `ContractStatusCard` (UI de contrato + status + ação de aceitar)
- `PatientMantraCard` (UI de mantra/psicoeducação rotativa)

## Changed
- `PatientFlow.js` passou a orquestrar e delegar UI para componentes (contrato + mantra)

## Fixed
- Import duplicado do `ContractStatusCard` no `PatientFlow.js`
- Module-not-found do `PatientMantraCard` (arquivo/caminho/extensão)
