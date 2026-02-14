# Fix: /api/patient/resolve-phone 400 (Bad Request)

## Sintoma
No console do browser:
- `GET /api/patient/resolve-phone 400 (Bad Request)`

No painel do paciente:
- Agenda não carrega (regras dependem do `phoneCanonical`).

## Causa mais comum
O backend não conseguiu determinar o `phoneCanonical` do paciente a partir do `users/{uid}`.

Isso pode acontecer quando:
- o documento `users/{uid}` não tem `phoneCanonical`/`phone`/`phoneNumber`, **ou**
- o paciente entrou via código de vinculação (custom token) e o `phoneCanonical` ficou apenas como *custom claim* no token, mas a rota não considerava esse claim.

## Correção aplicada
1) `resolve-phone` agora aceita `decoded.phoneCanonical` (custom claim) e grava em `users/{uid}`.
2) `patient/pair` agora grava `phoneCanonical/phone/phoneNumber` no `users/{uid}` no momento do pareamento.
3) `resolve-phone` retorna 403 se a sessão não for de paciente (evita confusão com sessão admin).

## Como validar
1. Reinicie o dev server.
2. Recarregue o painel do paciente.
3. Verifique se `resolve-phone` retorna `{ ok: true, phoneCanonical }`.
