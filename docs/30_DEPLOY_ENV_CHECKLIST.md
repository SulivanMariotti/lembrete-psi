# 30_DEPLOY_ENV_CHECKLIST

Checklist de deploy e ambientes (Next.js App Router + Firebase) para evitar regressões que quebram lembretes.

> Se o deploy quebra o push/import/envio, a constância sofre.  
> Use este checklist antes de publicar.

---

## 1) Variáveis de ambiente (Next.js)

Verifique no ambiente (Vercel/Render/etc.):

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

Admin/Server (somente server-side):
- [ ] credenciais do Admin SDK (service account / JSON / env vars)
- [ ] `FIREBASE_ADMIN_PROJECT_ID` (se usado)
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` (se aplicável)

> Nunca expor secrets em `NEXT_PUBLIC_*`.

---

## 2) Domínio e HTTPS (push exige)

- [ ] Site em HTTPS
- [ ] Domínio final configurado (sem misturar vários domínios de teste)
- [ ] Service Worker disponível em caminho correto
- [ ] Sem bloqueios de CSP que impeçam SW/push

---

## 3) Firebase Console

- [ ] Firestore Rules publicadas (ver doc 25)
- [ ] Authentication configurado conforme modo atual
- [ ] Cloud Messaging/Web Push configurado (VAPID se aplicável)
- [ ] Quotas observadas (ex.: email sign-in quota)

---

## 4) Smoke tests pós-deploy (mínimo)

Paciente teste (ativo):
- [ ] abre painel
- [ ] vê próxima sessão
- [ ] ativa notificações
- [ ] token grava em `subscribers/{phoneCanonical}`

Admin:
- [ ] upload/import agenda funciona
- [ ] dryRun retorna contagens e amostras
- [ ] envio real funciona e loga em `history`

Paciente inativo:
- [ ] envios bloqueados server-side e logados

---

## 5) Logs e observabilidade

- [ ] `history` recebendo logs de envio/dryRun/bloqueio
- [ ] console do deploy sem erros recorrentes
- [ ] troubleshooting disponível (doc 18)

---

## 6) Rollback

- [ ] Existe um commit/tag estável para voltar
- [ ] Mudanças de rules e env vars documentadas em `history` (`security.rules.updated`, `config.global.updated`)

---

## 7) Regra clínica final

Se o deploy for “incerto”, ele vira lembrete incerto.  
E lembrete incerto vira falta provável.

