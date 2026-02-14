# 18_TROUBLESHOOTING_COMMON_ERRORS

Este documento reúne erros recorrentes do **Lembrete Psi** e o caminho de diagnóstico.  
Objetivo: reduzir regressões que quebram lembretes (e quebrar lembretes aumenta risco de falta — falta interrompe evolução).

---

## 1) Firestore: `permission-denied` no painel do paciente

**Sintoma**
- Console: `FirebaseError: [code=permission-denied]: Missing or insufficient permissions.`
- Agenda do paciente não carrega / tela em branco / listener falha.

**Causa mais comum**

> **Padrão oficial:** `phoneCanonical` no projeto é **SEM 55** (DDD + número, 10–11 dígitos). Se algum documento estiver com `55...`, ele vai divergir de `subscribers/{phoneCanonical}` e pode causar `permission-denied`.
- Inconsistência entre:
  - `users/{uid}.phoneCanonical` (ou `phone`)
  - `appointments/*.phoneCanonical` (ou `phone`)
  - `subscribers/{phoneCanonical}` (docId)
- Ou paciente está `status: "inactive"` e endpoints/server-side bloqueiam corretamente.

**Checklist (ordem)**
1. Verifique em `users/{uid}`:
   - `role` (esperado: `"patient"`)
   - `status` (esperado: `"active"`)
   - `phoneCanonical` (string) — padrão do projeto: **somente dígitos, SEM 55** (ex.: `"11999999999"`)
2. Verifique um `appointments/{id}` do mesmo paciente:
   - `phoneCanonical` ou `phone` deve bater com o padrão
3. Verifique `subscribers/{phoneCanonical}`:
   - docId deve ser exatamente o `phoneCanonical`
   - `pushToken` pode existir ou não (sem token não impede carregar agenda, mas impede disparo push)
4. Se o painel depende de resolver telefone por email:
   - Confirme se existe rota server-side (ex.: `/api/patient/resolve-phone`) e se ela grava o `phoneCanonical` em `users/{uid}`.

**Correção típica**
- Padronizar e gravar `phoneCanonical` em:
  - `users/{uid}`
  - `appointments/*` durante import
  - `subscribers/{phoneCanonical}` como docId
- Nunca depender de “heurísticas” no client para resolver chave; use rota server-side.

---

## 2) React: `useEffect changed size between renders`

**Sintoma**
- `The final argument passed to useEffect changed size between renders...`

**Causa**
- Array de dependências variável, ex.:
  - `[a, b].filter(Boolean)`
  - `cond ? [a, b] : [a]`
  - `...(cond ? [x] : [])`

**Correção**
- Sempre deps com tamanho fixo:
  - `useEffect(fn, [a, b])` (mesmo que `b` seja `undefined`)

---

## 3) Web Push: Preview mostra candidatos mas `blockedNoToken` alto

**Sintoma**
- Dry run: `candidates > 0`, `sent = 0`, `blockedNoToken` alto.

**Causa**
- Pacientes não ativaram notificações no dispositivo
- `subscribers/{phoneCanonical}.pushToken` ausente/expirado

**Ação recomendada (produto)**
- No painel do paciente, reforçar psicoeducação:
  - “Ativar notificações é cuidar da sua constância. Você não precisa lembrar sozinho.”
- Mostrar estado claro:
  - Ativo neste aparelho / desativado / permissão negada.

---

## 4) Auth: `auth/quota-exceeded` (email sign-in)

**Sintoma**
- `Firebase: Exceeded daily quota for email sign-in. (auth/quota-exceeded).`

**Causas**
- Alto volume de links mágicos em curto período
- Uso em testes repetidos

**Ações**
- Para desenvolvimento: habilitar modo DEV (quando existir) e evitar disparos repetidos
- Para produção: monitorar volume e avaliar método alternativo (ex.: SMS/WhatsApp, login mais estável)

---

## 5) Import da agenda: “limpar” e reprocessar mantém preview antigo

**Sintoma**
- Após limpar, upload não “recarrega” sem trocar de menu
- Bloco de preview permanece e botão fica verde indevidamente

**Causa provável**
- Estado do componente Admin não reseta todos os campos relacionados (ex.: `preview`, `pending`, `fileRef`, `candidates`)
- `key` do input file não muda, então o browser não dispara `onChange`

**Ação técnica**
- Reset completo do state do upload
- Alterar `key` do `<input type="file">` ao clicar em “Limpar”

---

## Boas práticas para evitar regressão

- Bloqueios críticos sempre **server-side** (status inativo, janela de envio, etc.).
- Não “inventar join”: defina e persista `phoneCanonical` como chave de relacionamento.
- Logs em `history` com `type`, `createdAt`, `payload` (sem dados sensíveis).
- Sempre que um erro impactar lembretes, trate como risco clínico: menos lembrete → mais chance de falta.

