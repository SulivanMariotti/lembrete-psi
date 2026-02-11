# 16_API_ENDPOINTS_CATALOG.md

> Objetivo clínico do sistema: sustentar o vínculo terapêutico por meio de **constância**.  
> Na prática: rotas críticas (envio/decisões) devem ser **server-side**, com bloqueios para pacientes **inativos**.

## Convenções

- **Next.js App Router**: endpoints devem existir como `.../route.js`.
- Autenticação: quando necessário, usar `Authorization: Bearer <Firebase ID Token>`.
- Logs: preferir registrar em `history` com:
  - `type: string`
  - `createdAt: timestamp`
  - `payload: map` (schema flexível)
- Identidade: usar `phoneCanonical` como chave operacional (ver `13_PATIENT_KEY_DENORMALIZATION.md`).

---

## Endpoints (App Router)

> Observação: nomes abaixo refletem a convenção esperada; ajuste o caminho conforme sua árvore de `src/app/api`.

### 1) Resolver telefone do paciente (compatibilidade)

**Path:** `/api/patient/resolve-phone`  
**Arquivo:** `src/app/api/patient/resolve-phone/route.js`  
**Método:** `GET`  
**Auth:** obrigatório (ID Token)

**Responsabilidade**
- Obter `phone`/`phoneCanonical` para o usuário autenticado (`users/{uid}`).
- Fallback: localizar em `subscribers` por `email` (legado) quando necessário.
- Garantir merge em `users/{uid}` dos campos:
  - `phone`, `phoneNumber`, `phoneCanonical`

**Retorno (exemplo)**
```json
{ "ok": true, "phoneCanonical": "11999998888", "source": "users" }
```

---

### 2) Enviar lembretes de agenda (Admin)

**Path (exemplo):** `/api/admin/reminders/send`  
**Método:** `POST`  
**Auth:** obrigatório (Admin)

**Bloqueios server-side**
- Se paciente estiver `status: "inactive"` em `users/{uid}` ou `users` por `phoneCanonical`, **não enviar**.
- Se não houver `pushToken` válido em `subscribers/{phoneCanonical}`, **não enviar** (retornar como `blockedNoToken`).

**Recomendação de log**
- `history.type = "reminder_send_batch"`
- `payload`: intervalo, totais, amostras (sem PII), bloqueios por motivo.

---

### 3) Enviar follow-ups de Presença/Falta (Admin)

**Path (exemplo):** `/api/admin/attendance-followups/send`  
**Método:** `POST`  
**Auth:** obrigatório (Admin)

**Config usada (Firestore)**
- `config/global`:
  - `attendanceFollowupPresentTitle`, `attendanceFollowupPresentBody`
  - `attendanceFollowupAbsentTitle`, `attendanceFollowupAbsentBody`

**Bloqueios server-side**
- paciente inativo -> `blockedReason: "inactive"`
- sem token -> `blockedReason: "no_token"`

**Dry-run**
- aceitar `dryRun: true` e retornar `sample` interpolado + `blockedReason`.

**Recomendação de log**
- `history.type = "attendance_followups_batch"`
- `payload`: janela, totais, byStatus (present/absent), amostras sem PII.

---

### 4) Admin: reparo/normalização (scripts seguros)

**Path (exemplo):** `/api/admin/users/repair-roles`  
**Método:** `POST`  
**Auth:** obrigatório (Admin)

**Responsabilidade**
- Corrigir `role/status` ausentes ou inconsistentes em `users`.
- Nunca rodar do client; sempre server-side.

**Retorno**
- `{ ok, dryRun, scanned, updated, skipped }`

---

## Checklist de segurança (mínimo)

- [ ] Rotas de envio **nunca** executam envio no client.
- [ ] Bloqueio de paciente inativo ocorre **no endpoint**.
- [ ] Retornos incluem contadores (`sent`, `blocked`, `blockedNoToken`) para auditoria.
- [ ] Logs em `history` não armazenam conteúdo sensível (sem nome/telefone/email em claro).

