# Patch para CHANGELOG — 2026-02-13

> Cole/adicione estas entradas em `docs/04_CHANGELOG.md` (se você estiver mantendo esse arquivo).

## 2026-02-13
- Refatoração do Painel do Paciente para arquitetura **feature-based** (`src/features/patient/...`).
- Extração de utilitários (telefone/datas/ics) do `PatientFlow`.
- Criação de hooks do paciente: agenda, notas, push, lastSync.
- Extração de componentes: Header, Próxima sessão, Notificações, Agenda, Diário rápido (Notas), **Contrato**.
- Correção de erros de build/parsing no `PatientFlow` após extrações (inclui import duplicado).
