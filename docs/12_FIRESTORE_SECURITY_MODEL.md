<<<<<<< HEAD
# 12_FIRESTORE_SECURITY_MODEL
=======
# 11_FIRESTORE_SECURITY_MODEL.md
>>>>>>> c66289ccbe833c158649430e3e54b0587f907b5c

Este documento descreve **o modelo de segurança operacional** do Lembrete Psi (Next.js App Router + Firebase/Firestore), com foco em **evitar falhas críticas** que possam gerar fricção e aumentar risco de faltas (absenteísmo).  
Princípio do produto: **constância é cuidado** — o sistema remove atrito e sustenta o vínculo terapêutico.

---

## 1) Regras gerais

### 1.1 App Router (Next.js)
- Endpoints devem existir como: `src/app/.../route.js`
- Não usar arquivos soltos tipo `route_algo.js` fora da convenção do App Router.
- **Qualquer ação sensível** deve ocorrer server-side (API route), nunca apenas no client.

### 1.2 Bloqueios críticos sempre server-side
Bloqueios que **não podem depender do client**:
- Envio de lembretes para paciente **inativo** (`users/{uid}.status === "inactive"`)
- Envio de presença/falta para paciente **inativo**
- Envio quando não há `pushToken` ativo (`subscribers/{phoneCanonical}.pushToken`)
- Ações que gravam logs e alteram dados de agenda

Motivo: o client pode ser manipulado, estar desatualizado ou falhar por permissão; **a terapia não pode depender do acaso**.

---

## 2) Fontes de verdade e responsabilidades

### 2.1 `users/{uid}` — fonte de verdade do paciente
Campos esperados:
- `role`: `"patient"` (ou `"admin"`, etc.)
- `status`: `"active"` | `"inactive"`
- `deletedAt`: `timestamp` (quando inativado)
<<<<<<< HEAD
- `phone`: `string` (telefone canônico do projeto: **somente dígitos, SEM 55**)
=======
- `phone`: `string` (telefone canônico, recomendado E.164 sem símbolos)
>>>>>>> c66289ccbe833c158649430e3e54b0587f907b5c
- `phoneCanonical`: `string` (id usado para `subscribers`/`appointments` quando aplicável)
- `email`: `string`
- `displayName`: `string`

Regras:
- Operações administrativas alteram **sempre** `users/{uid}` (não “espelhos”).
- O painel do paciente deve ler o mínimo necessário do `users/{uid}` e, quando houver falha de permissão, usar **rotas server-side**.

### 2.2 `subscribers/{phoneCanonical}` — push token (web push)
Campos:
- `pushToken`: `string`
- `updatedAt`: `timestamp`
- `deviceInfo` (opcional): `map`

Regras:
- O token pertence ao dispositivo; pode expirar.  
- O sistema deve exibir estado **ativo/inativo** e orientar reativação quando necessário (sem “culpar” o paciente).

### 2.3 `appointments/*` — agenda consolidada
Campos estáveis recomendados:
- `phoneCanonical`: `string`
- `patientName`: `string`
- `dateIso`: `string` (YYYY-MM-DD)
- `time`: `string` (HH:mm)
- `professional`: `string`
- `service`: `string`
- `location`: `string`
- `status`: `string` (ex.: `"scheduled"`, `"canceled"`, etc.)
- `createdAt` / `updatedAt`: `timestamp`
- `source`: `string` (ex.: `"csv-upload"`)

Regras:
- Sincronização mantém histórico e cancela futuros removidos do upload (não apaga passado).
- Leituras do paciente devem ser filtradas por `phoneCanonical` (ou por `uid` se houver mapeamento), preferindo server-side quando rules forem restritivas.

### 2.4 `config/global` — configurações do sistema
Campos esperados:
- WhatsApp (mensagens 1/2/3, offsets)
- Templates presença/falta:
  - `attendanceFollowupPresentTitle`, `attendanceFollowupPresentBody`
  - `attendanceFollowupAbsentTitle`, `attendanceFollowupAbsentBody`
- Contrato/políticas (ex.: texto institucional)

Regras:
- Editável apenas por admin.
- Deve ser lido server-side para compor mensagens (evita manipulação client).

### 2.5 `history/*` — logs flexíveis
Padrão recomendado:
- `type`: `string`
- `createdAt`: `timestamp`
- `payload`: `map`

Regras:
- **Nunca** armazenar dados sensíveis no `payload` (mensagem completa com conteúdo íntimo, etc.).
- Preferir `payload` com:
  - ids, status, contagens, razões de bloqueio (`blockedReason`)
  - metadados técnicos mínimos para auditoria

---

## 3) Fluxos seguros (referência)

### 3.1 Envio de lembretes (agenda)
Server-side:
1) Resolver identidade do paciente (uid/phoneCanonical).
2) Validar `users/{uid}.status === "active"`.
3) Obter `subscribers/{phoneCanonical}.pushToken`.
4) Se não houver token → bloquear e logar (`blockedReason: "no_token"`).
5) Se ok → enviar, logar e retornar resumo (incluindo dryRun).

### 3.2 Envio de presença/falta
Server-side:
1) Validar intervalo e candidatos.
2) Validar paciente ativo (por uid ou pelo mapeamento phoneCanonical→uid).
3) Interpolar template com placeholders (`{nome}`, `{data}`, `{hora}`, etc.).
4) Expor `sample` mesmo em dryRun quando há candidatos (sem dados sensíveis).
5) Logar em `history` com `type` específico e `payload` mínimo.

---

## 4) Princípio clínico (UX e segurança)

O sistema protege o processo terapêutico:
- **Lembrar é cuidado ativo**
- **Conscientizar é psicoeducação**
- **Responsabilizar é fator de evolução**

Segurança não é “burocracia”: é **garantia de continuidade**.  
Quando um fluxo falha, aumenta a chance de falta — e **faltar interrompe evolução**.

