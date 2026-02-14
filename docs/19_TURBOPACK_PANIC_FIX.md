# Turbopack Panic (FATAL) ao compilar rotas /api

## Sintoma
No `npm run dev` aparece:

- `FATAL: An unexpected Turbopack error occurred. A panic log has been written to ...`
- Várias rotas `GET /api/... 500 (compile: ...)`

Exemplos comuns:
- `/api/patient/resolve-phone`
- `/api/appointments/last-sync`
- `/api/patient/push/status`
- `/api/attendance/confirmed`

## Causa mais comum neste projeto
O **Turbopack** pode entrar em *panic* ao bundle/compilar o import legado:

```js
import admin from "firebase-admin";
```

Especialmente quando isso aparece em várias rotas server (`app/api/**/route.js`).

## Correção aplicada
- Criado wrapper modular em `src/lib/firebaseAdmin.js` usando:
  - `firebase-admin/app`
  - `firebase-admin/auth`
  - `firebase-admin/firestore`
  - `firebase-admin/messaging`
- Substituído nas rotas:
  - `import admin from "firebase-admin";`
  - por:
  - `import admin from "@/lib/firebaseAdmin";`
- Forçado runtime Node em rotas server:
  - `export const runtime = "nodejs";`

## Pós-correção (importante)
Após aplicar o patch, limpe o cache e rode dev:

```bash
rm -rf .next
npm run dev
```

No Windows (PowerShell):
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

Se ainda ocorrer, abra o arquivo `next-panic-*.log` e compartilhe as últimas linhas.
