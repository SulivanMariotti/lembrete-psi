# Passo 29.1 — Hardening Produção: CORS (origem), retry seguro e fail-safe em auditoria

## Objetivo
Aprimorar segurança e resiliência antes de produção, sem mudar o fluxo do produto.

### Entregas
1) **Bloqueio de origem (anti-CSRF) nas rotas Admin**
- Implementado em `requireAdmin()`.
- Se a requisição vier com header `Origin`, ela **precisa** bater com o `host` atual (via `x-forwarded-host/host` + `x-forwarded-proto`).
- Requisições server-to-server (sem `Origin`) continuam funcionando.

2) **Retry seguro no client Admin**
- Implementado em `src/services/adminApi.js`.
- Retry automático apenas para **GET/HEAD** em falhas transitórias:
  - erro de rede (fetch throw)
  - status `502/503/504`
- **Não** faz retry de POST/PUT/DELETE (evita duplicidade).

3) **Mensagens de erro padronizadas (sem vazar detalhes) + requestId**
- Criado helper `src/lib/server/adminError.js`.
- Várias rotas Admin/legadas passaram a retornar:
  - `{ ok:false, error:"Ocorreu um erro. Tente novamente.", requestId }`
- Detalhes técnicos ficam apenas no **console do server**.

4) **Fail-safe de auditoria em caso de falha (Firestore/FCM)**
- Em exceções não previstas (catch), as rotas agora chamam `adminError()`.
- `adminError()` registra um evento em `audit_logs` com:
  - `status="error"`
  - `action="error:<acao>"`
  - `meta.requestId` e `meta.reason` (truncado)

## Arquivos principais alterados
- `src/lib/server/requireAdmin.js` (guard de origem)
- `src/lib/server/requireAuth.js` (erro padronizado)
- `src/lib/server/adminError.js` (helper padronizado + audit error)
- `src/services/adminApi.js` (retry seguro)

## Rotas com catch padronizado + audit error
- `src/app/api/admin/*` (principais)
- `src/app/api/send/route.js` (legado sensível)
- `src/app/api/attendance/import/route.js` (legado sensível)

## Como validar
1) Admin normal:
- Acessar `/admin` e listar pacientes.
- Forçar 1 falha (ex.: derrubar internet) e confirmar que:
  - UI mostra mensagem genérica
  - `audit_logs` recebe `status=error` com `requestId`.

2) Origem inválida:
- Fazer uma chamada para `/api/admin/...` com header `Origin` diferente do host.
- Deve retornar `403` com `Acesso bloqueado (origem inválida).`

