# 17 — Guia de Mensagens Clínicas (Tom + UX do Vínculo)

> Objetivo: sustentar o vínculo terapêutico por meio de lembretes e conteúdos psicoeducativos que reforçam **constância como cuidado**.
>
> Princípios: **sem julgamento**, **com firmeza**, **adulto–adulto**, reforçando contrato terapêutico e continuidade.

---

## 1) Princípios de comunicação

### 1.1 Constância é cuidado
- Comparecer não é “um detalhe administrativo”; é parte do processo terapêutico.
- A sessão é um espaço de cuidado reservado — existe com ou sem “confirmação”.

### 1.2 Firmeza sem punição
- Evitar tom acusatório (“você não veio”, “faltou de novo”).
- Preferir linguagem de responsabilidade e continuidade (“quando você falta, o processo perde ritmo”).

### 1.3 Presença como investimento
- Reforçar que estar na sessão é um investimento em si.
- Evitar promessas mágicas; focar em consistência e processo.

### 1.4 Clareza operacional
- Mensagens curtas, claras, com o essencial:
  - data/hora
  - local / modalidade (presencial/online)
  - como proceder se precisar remarcar (contato humano, não botão)

---

## 2) Estrutura recomendada das mensagens (templates)

### 2.1 Lembrete (48h / 24h / manhã)
**Estrutura:**
1) Saudação breve (nome)
2) Reforço do espaço de cuidado
3) Data/hora/local
4) Orientação operacional (se precisar ajustar, fale com a clínica)

**Exemplos:**
- “Olá, {nome}. Seu horário está reservado para você: {data} às {hora}. Estaremos à sua espera.”
- “Só passando para lembrar: {data} às {hora}. A constância é parte do cuidado — seu processo merece continuidade.”

### 2.2 Pós-presença (parabenizar constância)
**Objetivo:** reforçar continuidade e autoeficácia.
- “Obrigada por estar presente hoje. A repetição do cuidado é o que faz o processo avançar.”
- “Sua presença sustenta o ritmo do trabalho. Seguimos.”

### 2.3 Pós-falta (responsabilizar com acolhimento)
**Objetivo:** reconhecer a ausência sem moralizar; apontar impacto clínico; orientar retorno.
- “Percebi que hoje você não conseguiu vir. Quando a sessão é interrompida, o processo perde ritmo. Vamos retomar na próxima — sua constância faz diferença.”
- “Faltar não é só perder uma hora; é pausar um caminho em construção. Se precisar ajustar o horário, fale com a clínica.”

> Evitar: “você prejudicou”, “você desperdiçou”, “você deveria”.

---

## 3) Microcopy/UX no painel do paciente

### 3.1 Mantra fixo no topo (curto)
- “Constância é cuidado.”
- “A cura acontece na continuidade.”
- “Seu horário é um compromisso com você.”

### 3.2 Card rotativo (psicoeducação passiva)
**Sugestões de temas:**
- Resistências comuns (esquecimento, cansaço, evitamento) como parte do processo
- Ritmo terapêutico (ganho acumulativo)
- Contrato e espaço reservado

**Exemplo de card:**
> “Às vezes a vontade de faltar aparece quando algo importante está prestes a ser tocado. Não é sinal de fraqueza — é um convite para cuidar com mais constância.”

### 3.3 Sem “Cancelar” e sem “Confirmar”
- Cancelamento exige contato humano (barreira saudável).
- Não pedir confirmação toda semana para não fragilizar o contrato.

---

## 4) Diretrizes de tom (Do/Don’t)

### Do
- “Estaremos à sua espera.”
- “Seu processo merece continuidade.”
- “Se precisar ajustar, fale com a clínica.”

### Don’t
- “Você faltou de novo.”
- “Você está atrapalhando.”
- “Confirme presença para validarmos a sessão.”

---

## 5) Checklist de qualidade (antes de enviar)

- [ ] Mensagem tem data/hora e está correta
- [ ] Tom é firme, sem culpa/ameaça
- [ ] Reforça continuidade/constância
- [ ] Orienta contato humano em caso de ajuste
- [ ] Sem informações sensíveis no texto
- [ ] Template suporta placeholders: {nome}, {data}, {hora}, {profissional}, {servico}, {local}

---

## 6) Integração com o sistema (referência)

- Templates editáveis em `config/global`:
  - `msg1Title/Body`, `msg2Title/Body`, `msg3Title/Body`
  - `attendanceFollowupPresentTitle/Body`
  - `attendanceFollowupAbsentTitle/Body`
- Placeholders suportados:
  - `{nome}`, `{data}` (DD/MM/AAAA), `{dataIso}`, `{hora}`, `{profissional}`, `{servico}`, `{local}`, `{id}`
  - compatível com `{{nome}}` (legado)

---

## 7) Nota clínica (ética)

O sistema não substitui o trabalho clínico — ele **sustenta a borda**: organização, lembrança e psicoeducação leve para proteger o vínculo. A mensagem deve sempre servir à continuidade do cuidado.
