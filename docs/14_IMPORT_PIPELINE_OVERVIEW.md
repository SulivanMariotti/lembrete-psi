# 14_IMPORT_PIPELINE_OVERVIEW.md

> Objetivo: documentar o fluxo de importação (Agenda + Presença/Falta) e os pontos de validação que garantem **constância terapêutica**.
>
> Princípio clínico do produto: lembrete não é “marketing”; é **sustentação de vínculo**. Falhas de import → falhas de lembrete → mais faltas → interrupção do processo.

## 1) Visão geral do pipeline

O sistema possui dois fluxos principais de dados operacionais:

1. **Agenda (appointments)**: importação de planilha/CSV para criar/atualizar sessões futuras.
2. **Presença/Falta (attendance_logs / followups)**: importação de relatório/planilha com status (present/absent) para acionar mensagens psicoeducativas de continuidade.

Ambos os fluxos dependem de uma chave consistente de paciente (**phoneCanonical / patientKey**), conforme `13_PATIENT_KEY_DENORMALIZATION.md`.

## 2) Pipeline de Agenda (appointments)

### 2.1 Entrada
- Arquivo: CSV/planilha (origem: sistema externo sem API).
- Colunas mínimas recomendadas (nome pode variar):
  - `nome` (string)
  - `telefone` (string)
  - `data` (string ou date)
  - `hora` (string)
  - `profissional` (string)
  - `servico` (string)
  - `local` (string)
  - `id` (string) — identificador do agendamento (quando existir)

### 2.2 Normalização e validações
**Obrigatórias** (bloqueiam sync se falhar):
- Normalizar telefone → `phoneCanonical`.
- Gerar `appointmentId` estável (idealmente determinístico quando há `id`; caso contrário, hash dos campos essenciais).

**Recomendadas** (warning):
- Data/hora parseável.
- Profissional/serviço/local preenchidos (melhora templates e clareza).

### 2.3 Escrita (Firestore)
- Coleção: `appointments`
- Operação: upsert por `appointmentId`.
- Campos típicos:
  - `appointmentId` (string)
  - `phoneCanonical` (string)
  - `patientName` (string)
  - `dateIso` (YYYY-MM-DD)
  - `time` (HH:mm)
  - `professional` (string)
  - `service` (string)
  - `location` (string)
  - `status` (string: scheduled/cancelled)
  - `source` (string)
  - `updatedAt` (timestamp)

### 2.4 Consolidação / “Sincronizar”
Regra do produto (já adotada):
- **Mantém histórico**: não apaga o passado.
- **Cancela futuros removidos do upload**: sessões futuras que não aparecem mais no arquivo devem ser marcadas como `cancelled` (ou `isCancelled: true`).

### 2.5 Logs
- Registrar em `history`:
  - type: `appointments_import`
  - payload: contagens, erros por linha, amostra de IDs, intervalos de datas.

## 3) Pipeline de Presença/Falta (attendance)

### 3.1 Entrada
- Arquivo: planilha/CSV de presença/falta.
- Colunas mínimas recomendadas:
  - `telefone` (string)
  - `data` (string/date)
  - `hora` (string)
  - `status` (present/absent)
  - `profissional` (string)
  - `servico` (string)
  - `local` (string)
  - `id` (string) — se existir, vincular ao appointmentId

### 3.2 Normalização e validações
**Obrigatórias**:
- Normalizar telefone → `phoneCanonical`.
- Normalizar status para enum conhecido: `present` | `absent`.

**Recomendadas**:
- Vincular ao `appointmentId` quando possível.

### 3.3 Escrita (Firestore)
- Coleção recomendada: `attendance_logs` (ou equivalente já existente)
- Operação: upsert por chave determinística:
  - `attendanceId = phoneCanonical + '_' + dateIso + '_' + time` (ou usar `appointmentId` quando existir)

Campos típicos:
- `attendanceId` (string)
- `phoneCanonical` (string)
- `appointmentId` (string | null)
- `dateIso` (YYYY-MM-DD)
- `time` (HH:mm)
- `status` (present/absent)
- `professional`, `service`, `location`
- `createdAt` / `updatedAt` (timestamp)

### 3.4 Disparos (followups)
- Templates em `config/global`:
  - `attendanceFollowupPresentTitle/Body`
  - `attendanceFollowupAbsentTitle/Body`

- Placeholders suportados:
  - `{nome}`, `{data}` (DD/MM/AAAA), `{dataIso}`, `{hora}`, `{profissional}`, `{servico}`, `{local}`, `{id}`
  - compatível com `{{nome}}` legado

- **Bloqueios críticos (server-side)**:
  - Paciente `inactive` em `users/{uid}` → não enviar.
  - Sem `pushToken` em `subscribers/{phoneCanonical}` → não enviar (mas aparecer em preview com `blockedReason`).

### 3.5 Preview (dryRun)
Requisitos:
- Mostrar amostras interpoladas.
- Mostrar `blockedReason` mesmo quando não envia.

### 3.6 Logs
- Registrar em `history`:
  - type: `attendance_followup_dry_run` e/ou `attendance_followup_send`
  - payload: janela de datas, contagens por status, bloqueios por motivo, amostra.

## 4) Pontos de atenção que evitam regressões

1. **Chave única (`phoneCanonical`)**: sem isso, o paciente não recebe lembrete.
2. **Fonte de verdade (`users/{uid}`)**: status/role devem bloquear envio server-side.
3. **Sem botão de cancelar/confirmar** (UX): a sessão existe como contrato; o sistema reforça a presença.
4. **Falha silenciosa é pior**: sempre logar e mostrar `blockedReason` no preview.

## 5) Checklist rápido para validação

- [ ] Import agenda: `phoneCanonical` sempre preenchido.
- [ ] Sync cancela futuros removidos, não apaga passado.
- [ ] Import presença/falta: status normalizado e `attendanceId` determinístico.
- [ ] Preview mostra sample + blockedReason.
- [ ] Envio server-side bloqueia `inactive`.
- [ ] Logs em `history` com payload mínimo e sem dados sensíveis.
