# 23_PATIENT_NOTIFICATIONS_STATE_MACHINE

Este documento define o “estado” das notificações no painel do paciente, para evitar confusão e reduzir falhas de lembrete.

> Clinicamente: se o lembrete falha, a constância fica mais frágil.  
> O sistema deve deixar simples: **ativo / inativo / bloqueado**.

---

## 1) Fontes de verdade

- Browser Permission: `Notification.permission`
  - `"granted" | "denied" | "default"`
- Service Worker registrado?
- Token salvo em Firestore?
  - `subscribers/{phoneCanonical}.pushToken`

---

## 2) Estados (finite state machine)

### STATE A — Ativo (OK)
**Condições**
- `permission === "granted"`
- Service Worker OK
- `pushToken` existe em `subscribers/{phoneCanonical}`

**UI**
- ✅ “Notificações ativas neste aparelho.”

**Ação**
- Botão desnecessário (no máximo “Revalidar”)

---

### STATE B — Permissão padrão (ainda não pediu)
**Condições**
- `permission === "default"`

**UI**
- ⚠️ “Ative as notificações para proteger sua constância.”

**Ação**
- Botão “Ativar notificações” → chama `Notification.requestPermission()`

---

### STATE C — Permissão negada (bloqueado no navegador)
**Condições**
- `permission === "denied"`

**UI**
- ⛔ “Notificações bloqueadas neste navegador.”

**Ação**
- Instruções curtas:
  - clique no cadeado do site → permissões → Notificações → Permitir
- Mostrar link “Como ativar” (abre modal)

---

### STATE D — Permissão OK, mas token ausente
**Condições**
- `permission === "granted"`
- `pushToken` **não** existe ou vazio

**UI**
- ⚠️ “Notificações precisam ser reativadas neste aparelho.”

**Ação**
- Botão “Ativar novamente” (regerar token e salvar em `subscribers/{phoneCanonical}`)

---

### STATE E — Token expirado / inválido (detectado por envio)
**Condições**
- envio push falha com erro de token inválido/410/etc (dependendo do provider)

**UI**
- ⚠️ “Precisamos reativar as notificações para manter seus lembretes.”

**Ação**
- Forçar re-registro e atualizar token

---

## 3) Regras de logging (history)

- `push.permission.requested`
- `push.permission.denied`
- `push.token.saved`
- `push.token.missing`
- `push.send.failed` (sem payload sensível)

Sempre com:
- `createdAt`
- `payload`: `phoneCanonical`, `state`, `browser` (opcional), `errorCode` (se houver)

---

## 4) Textos clínicos recomendados

- “Ativar notificações é um cuidado com você: ajuda a manter a continuidade.”
- “Seu horário está reservado. Você não precisa lembrar sozinho(a).”
- “Se hoje estiver difícil, tudo bem — retomar é parte do processo.”

---

## 5) Critérios de sucesso (produto)

- Em 1 olhar, o paciente entende o estado.
- Em 1 clique, consegue ativar (quando permitido).
- Quando não for possível (permission denied), recebe instrução objetiva.
- DryRun no Admin mostra `blockedNoToken` e o painel do paciente ensina como resolver.

