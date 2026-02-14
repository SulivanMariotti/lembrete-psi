<<<<<<< HEAD
# 13 — Chave do Paciente (phoneCanonical) e Denormalização (Firestore / NoSQL)

> **Objetivo clínico (produto):** reduzir falhas de identificação/permissão e garantir que lembretes cheguem sempre ao paciente certo.  
=======
# 13 — Patient Key e Denormalização (Firestore / NoSQL)

> **Objetivo clínico (produto):** reduzir falhas de identificação/permitência e garantir que lembretes cheguem sempre ao paciente certo.  
>>>>>>> c66289ccbe833c158649430e3e54b0587f907b5c
> **Constância é cuidado:** quando o sistema perde o paciente por chave inconsistente (telefone/email), o lembrete falha → a presença cai → o processo terapêutico é interrompido.

---

<<<<<<< HEAD
## 1) Princípio NoSQL (Firestore): sem join no client

No Firestore, o relacionamento entre coleções deve ser feito por **chave determinística** e **campos redundantes (denormalizados)** para leitura rápida e regras simples.

**Regra de ouro:** qualquer dado necessário para *listar e exibir* no client deve estar **no próprio documento** consultado (ou vir de endpoint server-side), sem “join” no front.

---

## 2) Identidade do paciente: 3 conceitos (sem conflito)

### 2.1 `uid` (Firebase Auth) — identidade interna
- Documento: `users/{uid}`
- É a forma correta de identificar *a pessoa* no sistema (permissões, notas, contrato, auditoria).

### 2.2 `patientExternalId` — identidade externa (opcional)
- Usado quando existe um id estável vindo do sistema da clínica/planilha.
- Benefício: permite atualizar telefone/email **sem “criar outro paciente”**.

### 2.3 `phoneCanonical` — chave operacional (padrão do projeto)
- Usada para:
  - `subscribers/{phoneCanonical}` (push token)
  - `appointments/*` (campo `phone` e/ou `phoneCanonical`)
  - import/relatórios (presença/faltas, agenda)

**Importante:** `phoneCanonical` NÃO substitui o `uid`.  
Ela é a chave operacional para roteamento de agenda/push quando a origem é telefone.

---

## 3) Padrão oficial: `phoneCanonical` (SEM 55)

### Definição (padrão do projeto)
`phoneCanonical` deve ser sempre:
- somente dígitos
- **SEM prefixo 55**
- tamanho preferencial: 10–11 dígitos (DDD + número)

Ex.: `+55 (11) 92222-3333` → `11922223333`

> Observação: WhatsApp usa **com 55**. No projeto, isso é derivado (ver 3.3).

### Função de canonicalização (regra única)

Regras compatíveis com o código atual:
1. Remover tudo que não for dígito.
2. Remover zeros à esquerda.
3. Se vier com `55` e tamanho 12/13, **remover o 55**.
4. Se tiver mais que 11 dígitos (ex.: lixo antes), manter os **últimos 11**.
5. Resultado final esperado: `^[0-9]{10,11}$`.

> A canonicalização deve acontecer no **server-side** (endpoints) e também nos fluxos de admin (import/cadastro) para evitar divergência.

### 3.3 Número de WhatsApp (derivado, COM 55)
Para links/disparos WhatsApp:
- `whatsappPhone = "55" + phoneCanonical` (quando `phoneCanonical` tiver 10/11 dígitos)

Ex.: `phoneCanonical=11922223333` → `whatsappPhone=5511922223333`

---

## 4) Onde `phoneCanonical` deve existir (denormalização)

### A) `users/{uid}` (fonte de verdade do paciente)
Campos mínimos recomendados:
- `role`: `"patient"`
- `status`: `"active" | "inactive"`
- `name`: string
- `email`: string (opcional)
- `phoneCanonical`: string (**SEM 55**, somente dígitos)
- `phone`: string (pode repetir `phoneCanonical` para compat)
- `phoneNumber`: string (legado/compat)

**Invariante:** para paciente ativo, `users/{uid}.phoneCanonical` **não pode ser vazio**.

### B) `subscribers/{phoneCanonical}` (push token)
- docId = `phoneCanonical` (**SEM 55**)
- Campos:
  - `pushToken` (string)
  - `status` (string: `active|inactive`, opcional)
  - `lastSeen`, `updatedAt` (timestamp)

> O painel do paciente **não** deve ler `subscribers` direto no client; preferir `/api/patient/push/*`.

### C) `appointments/{id}` (agenda)
Campos recomendados:
- `phone` (string) — **SEM 55** (mesmo valor de `phoneCanonical`)
- `phoneCanonical` (string, opcional — espelho do `phone`)
- `email` (string, opcional — fallback legado)
- `isoDate` / `startISO` / demais campos de exibição

> Para reduzir `permission-denied`, o import da agenda deve garantir que `appointments.phone` bate com `users/{uid}.phoneCanonical`.

### D) Presença/Faltas
- `attendance_logs/*` e relatórios devem usar `phoneCanonical` sem 55, para casar com `subscribers` e `users`.

---

## 5) Anti-padrões (causam bugs e faltas)

- Misturar padrões:
  - alguns docs com `5511...` e outros com `11...`
- Usar `phone` com máscara/formatado (parênteses, hífen)
- Tentar “resolver chave” no client com heurística
- Depender de `email` para join de agenda (email muda e quebra)

---

## 6) Checklist rápido de correção (quando der problema)

1. Em `users/{uid}`:
   - `role="patient"`, `status="active"`
   - `phoneCanonical` preenchido e **sem 55**
2. Em um `appointments/{id}` do mesmo paciente:
   - `phone` deve bater com o `phoneCanonical`
3. Em `subscribers/{phoneCanonical}`:
   - docId é exatamente o `phoneCanonical` (sem 55)
   - `pushToken` existe (se o paciente ativou notificações)

Se algo estiver divergente, **corrigir na fonte (admin/import/cadastro)** — a terapia não pode depender do acaso.
=======
## 1) Princípio NoSQL: sem join, com consistência por chave

No Firestore, **o relacionamento** entre coleções deve ser feito por **chave determinística** e **campos redundantes (denormalizados)** para leitura rápida e regras simples.

**Regra de ouro:** qualquer dado que você precise para *listar e exibir* no cliente deve estar **no próprio documento** consultado (ou vir de endpoint server-side), sem “join” no front.

---

## 2) Chave única do paciente (patientKey)

### Chave primária recomendada: `phoneCanonical`

- **patientKey** = `phoneCanonical` (string)
- Padrão E.164 simplificado para Brasil: **somente dígitos**, incluindo DDI e DDD  
  Ex.: `+55 (11) 98322-6714` → `5511983226714`

> Motivo: o ecossistema do Lembrete Psi já depende de `subscribers/{phoneCanonical}` (pushToken) e muitos imports de agenda vêm por telefone.

### Campos obrigatórios e equivalências

- `phoneCanonical`: string (somente dígitos)
- `phone`: string (pode ser o mesmo que `phoneCanonical` ou formato humanizado)
- `phoneNumber`: string (legado / compatibilidade com UI antiga)

**Invariante:** se existir paciente ativo, `users/{uid}.phoneCanonical` **não pode ser vazio**.

---

## 3) Função de canonicalização (padrão)

### Regras (Brasil)
1. Remover tudo que não for dígito.
2. Se começar com `0`, remover zeros à esquerda.
3. Se tiver **11 dígitos** (DDD + número) sem DDI, prefixar `55`.
4. Se tiver **10 dígitos** (DDD + número sem 9), **não inventar** o 9 automaticamente (evita erro).  
   - Preferir corrigir na fonte (cadastro/import) ou manter como está e tratar como paciente distinto.
5. Resultado final: string `^[0-9]{12,13}$` (Brasil típico: 12–13 dígitos com DDI 55).

> Importante: a canonicalização deve acontecer **no server-side** (endpoints) e também no admin (import/cadastro) para evitar divergência.

---

## 4) Onde o patientKey deve existir (denormalização)

### A) `users/{uid}` (fonte de verdade do paciente)
Campos mínimos recomendados:
- `uid`: string (redundância opcional)
- `role`: `"patient" | "admin"`
- `status`: `"active" | "inactive"`
- `deletedAt`: timestamp (opcional)
- `name`: string
- `email`: string (opcional)
- `phoneCanonical`: string (**obrigatório**)
- `phone`: string (opcional)
- `phoneNumber`: string (opcional, legado)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Invariante:** `status:"inactive"` bloqueia envios **server-side**.

---

### B) `subscribers/{phoneCanonical}` (Web Push do paciente)
Documento id = `phoneCanonical`.

Campos:
- `pushToken`: string
- `active`: boolean (opcional; preferir status no `users`)
- `device`: map (opcional) `{ ua, platform, lastSeenAt }`
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Invariante:** se o paciente tiver web push ativo, deve existir `subscribers/{phoneCanonical}.pushToken`.

---

### C) `appointments/{docId}` (agenda importada / consolidada)
Campos mínimos para leitura e disparo:
- `patientKey`: string (**= phoneCanonical**)  
- `phoneCanonical`: string (redundante, mas facilita queries/legacy)
- `patientName`: string (denormalizado)
- `professional`: string
- `service`: string
- `location`: string
- `startAt`: timestamp
- `startAtIso`: string (opcional)
- `dateIso`: string (YYYY-MM-DD) (opcional, útil p/ filtros)
- `status`: `"scheduled" | "canceled"` (ou similar)
- `source`: `"upload"` | `"manual"` (opcional)
- `updatedAt`: timestamp
- `createdAt`: timestamp

**Recomendação:** qualquer filtro do painel do paciente deve ser feito por `patientKey/phoneCanonical` + intervalo de datas.

---

### D) `attendance_logs/{docId}` (presença/falta importada e/ou gerada)
Campos mínimos:
- `patientKey`: string (**= phoneCanonical**)
- `phoneCanonical`: string (redundante)
- `patientName`: string (denormalizado)
- `dateIso`: string (YYYY-MM-DD)
- `time`: string (HH:mm) (opcional)
- `status`: `"present" | "absent"`
- `source`: `"upload"` | `"system"` (opcional)
- `createdAt`: timestamp
- `payload`: map (opcional, flexível)

> Esses logs alimentam “constância” e follow-ups (parabenizar presença / orientar falta).

---

### E) `patient_notes/{uidOrPhoneCanonical}/{noteId}` (anotações)
Sugestão de chave:
- Preferir subcoleção por `uid` (segurança e permissão):
  - `patient_notes/{uid}/notes/{noteId}`
Campos:
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `title`: string
- `body`: string
- `tags`: array<string> (opcional)

---

### F) `config/global` (configurações do sistema)
Exemplos (já existentes no projeto):
- `contract*`, `whatsapp*`, `msg1/2/3*`, offsets
- templates presença/falta:
  - `attendanceFollowupPresentTitle`
  - `attendanceFollowupPresentBody`
  - `attendanceFollowupAbsentTitle`
  - `attendanceFollowupAbsentBody`

---

## 5) Padrões de consulta (para evitar permissão/denied)

### Frontend (Paciente)
- Evitar ler `appointments` diretamente se regras forem complexas.
- Preferir endpoint server-side que:
  1) valida idToken (uid)
  2) resolve `phoneCanonical` do usuário (fonte: `users/{uid}`)
  3) busca `appointments` por `phoneCanonical` + range
  4) devolve somente o necessário para UI

> Isso reduz “permission-denied” e mantém consistência.

---

## 6) Checklist obrigatório no import da agenda (Admin)

Antes de gravar cada registro de agenda:
1. Obter telefone bruto do CSV (`phone`).
2. Gerar `phoneCanonical` com a função padrão.
3. Validar:
   - se vazio → registro inválido (não sincronizar)
   - se formato fora do esperado → marcar como erro e exigir correção na planilha
4. Preencher redundâncias:
   - `patientKey = phoneCanonical`
   - `phoneCanonical = phoneCanonical`
   - `patientName` (quando disponível)
5. Salvar timestamps `updatedAt/createdAt`.

**Resultado esperado:** todo `appointment` futuro consultável por `phoneCanonical` sem ambiguidade.

---

## 7) Checklist obrigatório no cadastro do paciente (Admin)

Ao criar/editar paciente:
1. Capturar telefone (se houver)
2. Canonicalizar
3. Salvar em `users/{uid}`:
   - `phoneCanonical` (**obrigatório**)
   - `phone` e/ou `phoneNumber` (legado)
4. Opcional: criar/atualizar doc `subscribers/{phoneCanonical}` quando o paciente ativar notificações.

---

## 8) Exemplos de invariantes (para testes)

- **I1:** `users/{uid}.phoneCanonical` existe para todo paciente ativo.
- **I2:** qualquer `appointments` com `status:"scheduled"` tem `patientKey` e `phoneCanonical`.
- **I3:** endpoint de envio deve bloquear se `users/{uid}.status !== "active"`.
- **I4:** follow-ups presença/falta só disparam se houver `subscribers/{phoneCanonical}.pushToken`.

---

## 9) Notas de migração (quando já há dados “mistos”)

Se você já tem `appointments` antigos com `phone` mas sem `phoneCanonical`:
- Rodar um script/admin endpoint de migração para:
  - gerar `phoneCanonical`
  - preencher `patientKey`
  - manter histórico (não apagar passado)

Se existem pacientes com telefone divergente (com/sem 9):
- Tratar como **identidades distintas** até revisão manual.
- Não “corrigir automaticamente” números ambíguos.

---

## 10) Resultado clínico esperado

Com patientKey consistente:
- menos falhas de leitura/permissão
- menos falhas de disparo (push/whatsapp)
- mais previsibilidade do cuidado
- **mais constância** (o paciente sente que o compromisso existe e é sustentado)
>>>>>>> c66289ccbe833c158649430e3e54b0587f907b5c

