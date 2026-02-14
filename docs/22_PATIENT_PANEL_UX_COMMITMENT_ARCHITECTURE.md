    # 22_PATIENT_PANEL_UX_COMMITMENT_ARCHITECTURE

Este documento descreve decisões de UX no **Painel do Paciente** que reforçam compromisso e reduzem absenteísmo.

> Lembrete Psi não é “agenda com push”.  
> É tecnologia a serviço do vínculo: **constância é cuidado**.

---

## 1) Princípios clínicos (traduzidos em UI)

1. **O horário existe** (não depende de confirmação)
2. **Cancelar não pode ser um clique** (precisa contato ativo)
3. **Notificação é cuidado ativo** (reduz carga mental e resistência)
4. **Firmeza sem julgamento**
5. **Presença é investimento em si**

---

## 2) Componentes essenciais do painel

### 2.1 Cabeçalho (identidade + vínculo)
- “Olá, {nome}” (1x apenas — evitar duplicidade)
- Identificação do paciente:
  - nome
  - telefone (opcional mascarado)
  - status de contrato (se existir)

> Evitar repetição: se existir card com nome/telefone/status, não duplicar no topo.

### 2.2 Próxima sessão (card prioritário)
- Data e hora destacadas
- Profissional / serviço / local (se disponíveis)
- Microtexto clínico fixo:
  - “Seu horário é um espaço de cuidado. A continuidade faz diferença.”

### 2.3 Notificações (estado claro)
Substituir “checklist” extenso por um estado objetivo:
- ✅ Notificações ativas neste aparelho
- ⚠️ Notificações desativadas — botão “Ativar”
- ⛔ Permissão negada — instruções simples para o navegador

Sem excesso de títulos:
- Evitar título redundante “Notificações” se o texto já explica.

### 2.4 Biblioteca / apoio (opcional)
- Conteúdos curtos de psicoeducação:
  - “Faltar interrompe o processo”
  - “Retomar também é cuidado”
- Cards rotativos (poucos; não poluir)

---

## 3) O que NÃO ter (barreiras saudáveis)

- 🚫 Botão de “Cancelar sessão”
  - Cancelar terapia não deve ser tão fácil quanto cancelar um serviço on-demand.
- 🚫 Botão de “Confirmar presença”
  - Evita mensagem errada de que a sessão só existe se “confirmar”.
- 🚫 Linguagem de cobrança punitiva
  - Trocar culpa por responsabilidade + acolhimento.

---

## 4) Textos prontos (curtos)

### 4.1 Microcopy fixo (topo/next session)
- “Seu horário está reservado para você. **Comparecer faz parte do processo.**”

### 4.2 Quando notificações estão ativas
- “Notificações ativas neste aparelho. Você não precisa lembrar sozinho(a).”

### 4.3 Quando notificações estão inativas
- “Ative as notificações para proteger sua constância. É um cuidado com você.”

### 4.4 Após falta (sem julgamento)
- “Se hoje não foi possível, vamos acolher isso. **Retomar a continuidade é parte do cuidado.**”

---

## 5) Critérios de sucesso (produto)

- O paciente encontra em <10s:
  - próxima sessão
  - estado das notificações
- Fricção saudável para faltar/cancelar:
  - precisa contato humano (WhatsApp/telefone da clínica)
- Redução de faltas:
  - push confiável + psicoeducação breve + reforço de vínculo

