# Atualização — 2026-02-14 (Hotfix Rules: agenda do paciente)

## O que foi feito
- Fix: eliminar `permission-denied` na leitura de `appointments/*` no **primeiro acesso** do paciente pós-pareamento.
- Causa: rules dependiam apenas de `users/{uid}.phoneCanonical`, mas esse doc pode estar vazio/atrasado na janela inicial.
- Solução: permitir leitura quando `resource.data.phone == request.auth.token.phoneCanonical` (claim do custom token emitido no pareamento).

## Arquivos alterados
- `/firestore.rules`
- `docs/18_TROUBLESHOOTING_COMMON_ERRORS.md`
- `docs/25_FIRESTORE_RULES_GUIDE.md`
- `docs/00_ONDE_PARAMOS.md`
- `docs/15_HANDOFF_2026-02-14.md`

## Como publicar (cliques)
Firebase Console → **Firestore Database** → **Rules** → colar o arquivo `firestore.rules` → **Publish**
