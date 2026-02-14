# 19_CONSTANCY_METRICS_AND_FOLLOWUPS

Este documento descreve como medir **constância terapêutica** (presença/faltas) e como usar esses dados para sustentar o vínculo — sem julgamento, com firmeza e cuidado.

> Princípio clínico: **comparecer é parte do tratamento**.  
> A falta não é “só perder uma hora”; é uma interrupção do processo.

---

## 1) Fontes de dados

### 1.1 `attendance_logs` (recomendado)
Coleção para registrar presença/falta por sessão (importada por planilha ou lançada no Admin).

**Documento (exemplo)**
- `attendance_logs/{autoId}`:
  - `patientPhoneCanonical` (string) ✅ chave do paciente
  - `patientName` (string) *(opcional; denormalizado para exibição)*
  - `sessionDate` (timestamp) ✅ data da sessão
  - `sessionDateIso` (string `YYYY-MM-DD`) *(opcional)*
  - `status` (string: `"present" | "absent"`)
  - `source` (string: `"import" | "manual"`)
  - `createdAt` (timestamp)
  - `payload` (map) *(opcional: dados originais do import, sem sensíveis)*

### 1.2 `appointments` (não substitui logs)
`appointments` representa **agenda planejada**. Não é a mesma coisa que presença/falta.

---

## 2) Métricas de constância (painel)

### 2.1 Métricas essenciais
Para cada paciente (por janela de tempo, ex. últimos 30/60/90 dias):

- `sessionsScheduled` (int) *(se calculado a partir de agenda importada)*
- `sessionsAttended` (int)
- `sessionsMissed` (int)
- `attendanceRate` (float) = `attended / (attended + missed)`  
- `streakPresent` (int) = sequência atual de presenças
- `streakAbsent` (int) = sequência atual de faltas
- `lastStatus` (string) e `lastSessionDate` (timestamp)

### 2.2 Indicadores clínicos (heurísticos)
> São sinais para **cuidado ativo**, não para punição.

- **Risco leve**: 1 falta no último mês
- **Risco moderado**: 2 faltas em 60 dias
- **Risco alto**: 2 faltas seguidas ou ≥3 faltas em 90 dias

Registre sempre o critério usado no payload do log/relatório.

---

## 3) Disparos por constância (follow-ups)

### 3.1 Regras server-side (obrigatório)
Antes de qualquer envio:
- Validar `users/{uid}.status === "active"`
- Bloquear se `inactive` (e logar em `history` com `blockedReason`)
- Verificar `subscribers/{phoneCanonical}.pushToken` para push
- Em caso de WhatsApp, validar política operacional (ex.: janela de envio, opt-in)

### 3.2 Mensagens — tom e objetivo
As mensagens devem:
- Reforçar que **a sessão é um espaço de cuidado**
- Convidar com firmeza
- Evitar moralismo/culpa
- Manter o foco em continuidade e vínculo

**Presença (reforço positivo)**
- “Sua presença é um passo concreto no seu cuidado. A continuidade faz diferença.”

**Falta (sem julgamento, com firmeza)**
- “A ausência interrompe o processo. Se algo aconteceu, vamos acolher isso — e retomar é parte do cuidado.”

### 3.3 Onde ficam os templates
No `config/global`:
- `attendanceFollowupPresentTitle`
- `attendanceFollowupPresentBody`
- `attendanceFollowupAbsentTitle`
- `attendanceFollowupAbsentBody`

Placeholders suportados: `{nome}`, `{data}`, `{dataIso}`, `{hora}`, `{profissional}`, `{servico}`, `{local}`, `{id}`  
Compatível com legado `{{nome}}`.

---

## 4) Relatório por planilha (segunda fonte)

Quando o sistema externo não tem API, usar import por planilha:
- Garantir `patientPhoneCanonical` no momento do import (não deixar “para depois” no client)
- Deduplicar por:
  - `patientPhoneCanonical + sessionDateIso + status`
- Manter histórico (não apagar passado)

---

## 5) Logs em `history` (observabilidade)

Registrar:
- `type`: `attendance.followup.dryrun`, `attendance.followup.sent`, `attendance.followup.blocked`
- `createdAt`
- `payload`:
  - `patientPhoneCanonical`
  - `status` (`present/absent`)
  - `blockedReason` (quando aplicável)
  - `templateId` (opcional)
  - `provider` (`push`/`whatsapp`)
  - `debug` (contagens, amostras sem dados sensíveis)

---

## 6) Checklist de qualidade (produto)

- O painel do paciente deve mostrar claramente:
  - próximas sessões
  - lembretes ativos (notificações)
  - mensagens que reforçam constância como cuidado
- O Admin deve conseguir:
  - importar presença/falta
  - ver taxa de constância por paciente
  - acionar follow-ups (dryRun + envio real)
- Erros devem ser resolvidos com prioridade:
  - lembrete quebrado → mais risco de falta → quebra de continuidade

