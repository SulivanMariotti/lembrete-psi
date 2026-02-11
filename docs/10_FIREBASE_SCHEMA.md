# Firebase / Firestore — Schema (snapshot)

> **Sem dados sensíveis.** Apenas estrutura: coleções, `docId`, campos e tipos.  
> Objetivo: documentar a “fonte de verdade” e as coleções operacionais do **Lembrete Psi**.

---

## Visão geral (regras de uso)

- **users/{uid}** é a fonte de verdade do paciente (role/status, identidade e aceite do contrato).
- **subscribers/{phoneCanonical}** guarda o **pushToken** (Web Push) do paciente.
  - Observação: o painel do paciente deve preferir **rotas server-side** (`/api/patient/push/*`) para evitar `permission-denied`.
- **config/global** centraliza as configurações de contrato, WhatsApp e templates.
- **history/** é **auditoria** com schema flexível: cada evento define seu `payload`.
- Recomendação de consistência: sempre que possível, gravar `phoneCanonical` e manter `users.phoneCanonical` sincronizado com o padrão usado em `subscribers` e `appointments`.

---

## Coleções e documentos

## 1) users/{uid}

**DocId**
- `uid` (string)

**Campos estáveis**
- `role` (string) — ex.: `"admin" | "patient"`
- `status` (string) — ex.: `"active" | "inactive"`
- `name` (string)
- `email` (string)
- `phone` (string) — pode conter o telefone “como chegou”
- `phoneNumber` (string, opcional) — telefone “limpo” (legado/compat)
- `phoneCanonical` (string) — **chave canônica** usada no sistema (ex.: `5511999999999`)
- `patientExternalId` (string, opcional) — id externo/legado (quando existir)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `deletedAt` (timestamp, opcional) — usado ao desativar
- `inactiveReason` (string, opcional)

**Contrato terapêutico (aceite — opcional)**
- `contractAcceptedVersion` (number, opcional) — versão aceita, comparada com `config/global.contractVersion`
- `contractAcceptedAt` (timestamp, opcional)

**Observação**
- Quando `status = "inactive"`, endpoints server-side bloqueiam envios (agenda + presença/falta).

---

## 2) subscribers/{phoneCanonical}

**DocId**
- `phoneCanonical` (string)

**Campos**
- `pushToken` (string, opcional) — token do Web Push no navegador
- `token` (string, opcional) — legado/compat
- `email` (string, opcional)
- `isActive` (boolean, opcional)
- `lastSeen` (timestamp, opcional)
- `createdAt` (timestamp, opcional)
- `updatedAt` (timestamp, opcional)

**Observação**
- O paciente deve consultar/registrar push via `GET/POST /api/patient/push/*` (server-side), em vez de ler `subscribers` diretamente no client.

---

## 3) appointments/{id}

**DocId**
- `id` (string) — normalmente `autoId`

**Campos (principais)**
- `phone` (string) — usado nas rules em algumas leituras client-side
- `phoneCanonical` (string, recomendado)
- `email` (string, opcional)
- `name` (string)
- `dateIso` (string) — `YYYY-MM-DD`
- `time` (string) — `HH:mm`
- `professional` (string, opcional)
- `service` (string, opcional)
- `location` (string, opcional)
- `status` (string) — `scheduled | cancelled | done` (varia conforme implementação)
- `cancelled` (boolean, opcional)
- `createdAt` (timestamp, opcional)
- `updatedAt` (timestamp, opcional)

---

## 4) attendance_logs/{id}

**DocId**
- `id` (string) — `autoId`

**Campos (principais)**
- `phoneCanonical` (string)
- `dateIso` (string) — `YYYY-MM-DD`
- `status` (string) — `"present" | "absent"`
- `createdAt` (timestamp)
- `payload` (map, opcional) — dados auxiliares da importação

---

## 5) patient_notes/{uid}

**DocId**
- `uid` (string)

**Campos (principais)**
- `notes` (array/map) — conforme implementação do painel do paciente
- `updatedAt` (timestamp)

---

### config/global

**DocId**
- `global` (string)

**Campos (principais)**
- `whatsapp` (string)
- `contractText` (string)
- `contractVersion` (number)
- `updatedAt` (timestamp)

**Mensagens de lembrete (agenda)**
- `msg1` (string)
- `msg2` (string)
- `msg3` (string)
- `msg48h` (string, opcional)
- `msg24h` (string, opcional)
- `msg12h` (string, opcional)
- `reminderOffsetsHours` (array<number>) — ex.: `[48, 24, 12]`

**Presença/Falta (templates editáveis no Admin)**
- `attendanceFollowupPresentTitle` (string)
- `attendanceFollowupPresentBody` (string)
- `attendanceFollowupAbsentTitle` (string)
- `attendanceFollowupAbsentBody` (string)

**Placeholders suportados nos templates**
- `{nome}`
- `{data}` (DD/MM/AAAA)
- `{dataIso}`
- `{hora}`
- `{profissional}`
- `{servico}`
- `{local}`
- `{id}`
- Compatível com legado: `{{nome}}`

---

## 7) history/{id} (auditoria — schema flexível)

Coleção de logs/eventos do sistema (**não é** fonte de verdade de domínio).

**DocId**
- `id` (string) — `autoId`

**Campos (padrão recomendado)**
- `type` (string)
- `createdAt` (timestamp)
- `payload` (map) — dados variáveis por tipo

**Campos legados (podem existir)**
- `sentAt` (timestamp)
- `summary` (string)
- `types` (array<string>)

---
