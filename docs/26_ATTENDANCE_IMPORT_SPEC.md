# 26_ATTENDANCE_IMPORT_SPEC

Especificação do import de **Presença/Falta** (segunda planilha/relatório) para alimentar:
- painel de constância
- disparos futuros (parabenizar presença / orientar em caso de falta)

> Objetivo clínico: transformar dado operacional em suporte de vínculo.  
> Presença reforça evolução; falta sinaliza necessidade de acolhimento e retomada.

---

## 1) Entrada (planilha)

### 1.1 Formatos aceitos
- CSV (recomendado) ou XLSX exportado para CSV antes do upload.

### 1.2 Colunas mínimas (obrigatórias)
- `telefone` ou `phone` (string)
- `data` (string `DD/MM/AAAA` ou `YYYY-MM-DD`)
- `status` (string: `present` / `absent`)

### 1.3 Colunas opcionais (melhoram mensagens)
- `nome` (string)
- `hora` (string `HH:mm`)
- `profissional` (string)
- `servico` (string)
- `local` (string)
- `id` (string) *(id da sessão no sistema externo, se houver)*

### 1.4 Normalização obrigatória
- Gerar `phoneCanonical` a partir de `telefone` (padrão do projeto).
- Derivar `sessionDateIso` (string `YYYY-MM-DD`).

---

## 2) Validação

Cada linha:
- [ ] `phoneCanonical` válido (string, só dígitos, sem espaços)
- [ ] `sessionDateIso` válido
- [ ] `status` ∈ `{present, absent}`

Relatório de validação (antes de gravar):
- total de linhas
- válidas / inválidas
- principais motivos de invalidação (ex.: telefone vazio, data inválida)

---

## 3) Escrita no Firestore

### 3.1 Coleção alvo
- `attendance_logs/{autoId}`

### 3.2 Campos recomendados
- `patientPhoneCanonical` (string) ✅
- `sessionDate` (timestamp) ✅
- `sessionDateIso` (string) *(opcional, ajuda filtros)*
- `status` (`present|absent`) ✅
- `source` (`import|manual`) ✅
- `createdAt` (timestamp) ✅
- `payload` (map) *(opcional: colunas originais sem sensíveis extras)*

### 3.3 Deduplicação (evitar duplicar import)
Chave lógica:
- `patientPhoneCanonical + sessionDateIso + status`

Estratégias:
- A) Buscar existentes no intervalo e pular duplicatas (mais simples)
- B) Usar docId determinístico (ex.: hash da chave lógica) (mais robusto)

> Importante: **não apagar passado**. Se reimportar, apenas ignorar duplicatas ou atualizar o mesmo docId.

---

## 4) Geração de follow-ups (presença/falta)

### 4.1 DryRun obrigatório
- Contar candidatos (linhas válidas)
- Identificar bloqueios:
  - sem token (`subscribers/{phoneCanonical}.pushToken` ausente)
  - paciente inativo (`users/{uid}.status !== "active"`)
- Mostrar amostras interpoladas (1–3) com placeholders

### 4.2 Envio real (server-side)
- Endpoint App Router: `.../route.js`
- Validar `Bearer <idToken>` e role admin
- Aplicar bloqueios críticos server-side
- Logar em `history`:
  - `attendance.followup.sent`
  - `attendance.followup.blocked` (com `blockedReason`)
  - `attendance.followup.dryrun`

---

## 5) UX no Admin

Fluxo sugerido (igual ao de agenda):
1) Upload
2) Validar
3) Sincronizar (gravar logs)
4) DryRun (preview)
5) Enviar

O bloco de preview deve mostrar:
- `byStatus` (present/absent)
- `blockedNoToken`
- `blockedInactive`
- `sample` interpolado (mesmo quando bloqueado)

---

## 6) Critérios de sucesso (produto)

- Import é simples e previsível.
- Admin consegue ver constância por paciente.
- Mensagens reforçam:
  - Presença: “continuidade é cuidado”
  - Falta: “retomar é parte do cuidado” (sem julgamento)
- Falhas de envio aparecem como **bloqueio com motivo**, nunca como “sumiu”.

