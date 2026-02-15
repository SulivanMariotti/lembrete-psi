# 13 — Chave do Paciente (phoneCanonical) e Denormalização (Firestore / NoSQL)

> **Objetivo clínico (produto):** reduzir falhas de identificação/permissão e garantir que lembretes cheguem sempre ao paciente certo.  
> **Constância é cuidado:** quando o sistema perde o paciente por chave inconsistente (telefone/email), o lembrete falha → a presença cai → o processo terapêutico é interrompido.

---

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

