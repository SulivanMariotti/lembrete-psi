# Changelog

## 2026-02-10
- Ajuste planejado: Firestore Rules — permitir leitura de `appointments` pelo paciente também por `email` (fallback) e por `phoneCanonical`.
- Objetivo: eliminar erro `permission-denied` em snapshot listener no painel do paciente.
- Arquivo: `firestore.rules`
