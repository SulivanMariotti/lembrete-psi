# Lembrete Psi — Onde paramos

> Este arquivo espelha o `docs/00_ONDE_PARAMOS.md` para manter compatibilidade com históricos antigos de docs.

# Onde paramos — Lembrete Psi (2026-02-14)

## Status de hoje (encerrado)
- Foco: **aprimoramento do WEB** (Capacitor ficou **pausado**).
- Estabilidade: Turbopack voltou a funcionar sem “panic”.
- Rotas do paciente/admin voltaram a responder corretamente (resolve-phone 200).
- Vercel: corrigidos arquivos com **merge conflict markers** que estavam quebrando o build.

## Entregas concluídas hoje
1) **Turbopack panic fix**
   - Ajuste para evitar “FATAL: unexpected Turbopack error / panic log”.
2) **Resolve Phone (patient)**
   - `GET /api/patient/resolve-phone` estava 400 → agora **200**.
   - Suporte a `phoneCanonical` vindo de claims / pareamento e persistência no `users/{uid}`.
3) **Merge markers removidos (build local/Vercel)**
   - Removidos `<<<<<<<`, `=======`, `>>>>>>>` nas rotas:
     - `src/app/api/admin/patient/pair-code/route.js`
     - `src/app/api/admin/push/status-batch/route.js`
     - `src/app/api/patient/pair/route.js`
     - (e também já havíamos corrigido outros arquivos com markers como `resolve-phone/route.js`).
4) **UX Paciente (mobile-first)**
   - Card **“Seu próximo atendimento”** com **destaque sutil** e conteúdo legível no celular.
   - **Contrato** sempre disponível no **menu superior** (para releituras futuras), com modal.
   - Correção de cor/contraste no menu (**Admin / Sair** estavam claros demais).
   - **Mantra fixo** no topo do painel (psicoeducação leve e contínua).
   - Remoção de texto redundante no header (“Olá, paciente… frase longa”) e melhoria do layout do telefone/WhatsApp.

5) **Firestore Rules (appointments) — fallback por claim phoneCanonical**
   - Fix: remove `permission-denied` na janela do primeiro acesso pós-pareamento, quando `users/{uid}.phoneCanonical` ainda não está persistido.
   - Solução: permitir leitura do `appointments/*` quando `resource.data.phone == request.auth.token.phoneCanonical`.
   - Arquivo: `/firestore.rules`

## O que validar amanhã (check rápido)
- `npm run build` local passando.
- Deploy Vercel “verde”.
- No paciente:
  - “Seu próximo atendimento” visível e legível no mobile.
  - Menu: Contrato abre corretamente e Admin/Sair legíveis.
  - `GET /api/patient/resolve-phone` retorna 200.

## Próximo passo sugerido (amanhã)
> **Painel de constância (presença/faltas)**: consolidar import/registro e preparar os disparos/psicoeducação de follow-up (parabenizar presença + orientar em caso de falta), sem criar “botão de cancelar”.

- Ajustar/confirmar a fonte de dados (planilha 2 de presença/faltas).
- Garantir que o painel de constância e o disparo estejam acessíveis no Admin.
- Revisar armazenamento (Firestore) para histórico de constância (sem joins; denormalização).

---
Capacitor: **pausado** por decisão (retomar só quando o WEB estiver estável e a UX do paciente redonda).
