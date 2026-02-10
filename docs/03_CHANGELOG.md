# Changelog

## 2026-02-10
- Fix: removeu `permission-denied` no painel do paciente ao entrar.
- Causa: `onSnapshot` em `subscribers/{phoneCanonical}` quando o doc não existia; regras antigas dependiam de `resource.data.email` (resource null), gerando `permission-denied`.
- Solução: Firestore Rules agora permitem o paciente ler (mesmo se não existir) e criar/atualizar apenas o próprio documento em `subscribers/{phoneCanonical}`; mantém admin-only para os demais documentos.
- Arquivo: `/firestore.rules`
- Teste: logout → login paciente → abrir painel → sem erros no console.