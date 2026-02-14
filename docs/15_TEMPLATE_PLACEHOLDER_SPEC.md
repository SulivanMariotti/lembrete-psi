# 15 — Template & Placeholder Spec (Lembrete Psi)

> Objetivo do sistema: sustentar **constância terapêutica**. Mensagens e textos existem para reforçar vínculo e compromisso (sem julgamento, com firmeza): **comparecer é parte do tratamento**; faltar interrompe continuidade.

Este documento padroniza:
- Onde ficam os templates no Firestore (`config/global`)
- Quais placeholders são suportados
- Regras de compatibilidade (legado `{{nome}}`)
- Regras de fallback quando faltar dado
- Boas práticas clínicas (tom, consistência, clareza)

---

## 1) Onde ficam os templates (Firestore)

Coleção: `config`
- Documento: `global`

Campos relevantes (string):

### 1.1) Agenda (msg1/2/3)
- `reminderMsg1Title`
- `reminderMsg1Body`
- `reminderMsg2Title`
- `reminderMsg2Body`
- `reminderMsg3Title`
- `reminderMsg3Body`

> Observação: nomes exatos podem variar conforme implementação atual, mas **o padrão é:**
`reminderMsg{N}{Title|Body}` em `config/global`.

### 1.2) Presença/Falta (follow-up)
- `attendanceFollowupPresentTitle`
- `attendanceFollowupPresentBody`
- `attendanceFollowupAbsentTitle`
- `attendanceFollowupAbsentBody`

---

## 2) Placeholders suportados

### 2.1) Placeholders oficiais (recomendado)
Use chaves simples:

- `{nome}` — nome do paciente
- `{data}` — data formatada **DD/MM/AAAA**
- `{dataIso}` — data **YYYY-MM-DD**
- `{hora}` — hora **HH:mm**
- `{profissional}` — profissional responsável
- `{servico}` — tipo de atendimento/serviço
- `{local}` — local (presencial/online/endereço/sala)
- `{id}` — identificador interno (ex.: id da sessão/consulta/import)

### 2.2) Compatibilidade legado
O sistema também aceita:
- `{{nome}}` (equivalente a `{nome}`)

> Recomendação: ao editar no Admin, **usar sempre `{nome}`**.
Legado é mantido apenas para não quebrar templates antigos.

---

## 3) Regras de interpolação

### 3.1) Ordem de aplicação
1) Interpolação dos placeholders oficiais `{...}`
2) Interpolação do legado `{{nome}}`
3) Sanitização simples (trim/normalização de espaços)
4) Se algum placeholder permanecer sem valor, aplicar fallback (abaixo)

### 3.2) Fallbacks (quando faltar dado)
Para manter consistência e evitar mensagens “quebradas”:

- `{nome}`: `"Olá!"` (ou `"Olá, tudo bem?"` se o template estiver no corpo)
- `{data}`: usar `{dataIso}` se existir; senão `"sua sessão"`
- `{hora}`: `""` (remover “às {hora}” se o template tiver lógica no texto — ver boas práticas)
- `{profissional}`: `"sua terapeuta"`
- `{servico}`: `"sessão"`
- `{local}`: `"seu espaço de cuidado"`
- `{id}`: `""` (não exibir se não houver)

> Importante: se faltar dado estrutural (ex.: não há data/hora), prefira um texto
que ainda faça sentido: “Seu horário é um espaço reservado para você.”

---

## 4) Exemplos prontos (tom clínico: firme + acolhedor)

### 4.1) Agenda — 48h antes (Msg 1)
**Title**
> Lembrete do seu horário

**Body**
> {nome}, sua sessão está reservada para {data} às {hora}.  
> Este é um espaço de cuidado e continuidade — comparecer sustenta o seu processo.

### 4.2) Agenda — 24h antes (Msg 2)
**Body**
> Passando para reforçar: {data} às {hora}.  
> A constância é parte do tratamento — a evolução acontece na continuidade.

### 4.3) Agenda — manhã do dia (Msg 3)
**Body**
> Hoje é dia de sessão, {nome}. Seu horário está te esperando.  
> Mesmo quando dá vontade de adiar, comparecer é um gesto de cuidado com você.

### 4.4) Follow-up — Presença
**Body**
> {nome}, obrigada por comparecer hoje.  
> Cada presença fortalece o vínculo e dá continuidade ao que você está construindo.

### 4.5) Follow-up — Falta
**Body**
> {nome}, percebemos sua ausência hoje.  
> Faltar não é apenas perder uma hora — é interromper uma sequência importante do seu processo.  
> Se precisar, entre em contato para alinharmos o melhor caminho.

---

## 5) Boas práticas de escrita (produto + clínica)

- **Sem culpa, com firmeza:** evitar julgamento (“você fez errado”), reforçar contrato e continuidade.
- **Curto e claro:** mensagens de lembrete devem ser diretas.
- **Repetição intencional:** repetir a ideia central (constância = cuidado) com variações.
- **Evitar ambiguidade:** sempre que possível, incluir `{data}` e `{hora}`.
- **Não oferecer “cancelar” fácil:** o produto não deve incentivar ausência impulsiva.
- **Evitar links desnecessários:** manter foco no comparecimento e no vínculo.

---

## 6) Checklist de validação (antes de liberar template)

1) Template contém pelo menos `{nome}` ou uma saudação genérica.
2) Se for lembrete, contém `{data}` e `{hora}` (quando disponíveis).
3) Não contém placeholders não suportados (ex.: `{telefone}`, `{email}`).
4) Testado no Preview (dryRun) com:
   - amostra com dados completos
   - amostra com dados faltando (sem `{hora}`, sem `{profissional}`)
5) Linguagem reforça: **presença = continuidade**.

