# 29_WEB_PUSH_PROVIDER_NOTES

Notas práticas sobre Web Push no Lembrete Psi (o que costuma quebrar e como manter confiável).

> Quando o push falha, o lembrete falha.  
> E quando o lembrete falha, cresce o risco de falta — e a continuidade se fragiliza.

---

## 1) Componentes do fluxo

- Permissão do navegador: `Notification.permission`
- Service Worker registrado (PWA / push)
- Subscription/token gerado pelo browser
- Token salvo em Firestore:
  - `subscribers/{phoneCanonical}.pushToken`

Envio:
- endpoint server-side (Admin SDK / provider)
- bloqueios críticos server-side (paciente inativo, etc.)
- logging em `history`

---

## 2) Causas comuns de “não recebi”

1. **Permissão negada** (`permission === "denied"`)
2. **Permissão default** (nunca ativou)
3. **Service Worker não registrado** (domínio/HTTPS/caminho errado)
4. **Token ausente** em `subscribers/{phoneCanonical}`
5. **Token expirado** / inválido (o browser revogou)
6. **Troca de aparelho/navegador** (token é por device + navegador)
7. **Modo economia/bloqueio do sistema** (mobile)

---

## 3) Como detectar problemas no sistema

### 3.1 Pelo Admin (dryRun)
- `blockedNoToken` alto → token ausente
- `blockedInactive` → paciente inativo (bloqueio correto)
- `sample` deve aparecer com `blockedReason`

### 3.2 Pelo painel do paciente
- Mostrar estado (doc 23):
  - Ativo / Inativo / Permission denied / Token ausente
- Botão “Ativar” ou “Ativar novamente”

### 3.3 Por logs `history`
Tipos recomendados:
- `push.permission.requested`
- `push.permission.denied`
- `push.token.saved`
- `push.send.attempt`
- `push.send.failed`
- `push.send.success`

Payload sem dados sensíveis; incluir:
- `phoneCanonical`
- `errorCode` (quando houver)
- `provider` (push/whatsapp)

---

## 4) Política de revalidação de token

Quando detectar token inválido em envio:
- marcar como inválido (server-side) e logar
- orientar paciente a reativar notificações no painel
- opcional: limpar `pushToken` para forçar re-registro

---

## 5) Regras importantes (produto)

- Não “silenciar” falha de envio:
  - sempre retornar contagens e `blockedReason`
- Token é por device:
  - trocar de aparelho exige reativação
- Instruções devem ser curtas e diretas:
  - “Ative para proteger sua constância”

---

## 6) Checklist rápido de QA do push

- [ ] Rodar em HTTPS
- [ ] Service Worker registrado sem erros
- [ ] Permissão `granted`
- [ ] Token gravado em `subscribers/{phoneCanonical}`
- [ ] DryRun no Admin mostra candidato e não bloqueia por token
- [ ] Envio real registra `push.send.success` em `history`

