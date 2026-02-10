# Fluxos e Disparos — Lembrete Psi (Fonte da Verdade)

Este documento descreve o comportamento esperado do sistema (produto + clínica).
O código deve seguir este fluxo.

## Fluxo atual (Paciente)

### Pré-requisito: cadastro pelo Admin
O paciente só consegue acessar o painel se existir um cadastro em `users` com:
- name
- email
- phoneCanonical (WhatsApp)
- patientExternalId (ID do sistema interno da clínica)
- status (active/inactive)
- role = patient

### Acesso ao painel do paciente
Ao entrar no painel, o paciente tem:

1) **Ativação de Web Push**
- O paciente ativa notificações Web Push.
- Isso cria/atualiza `subscribers/{phoneCanonical}` com `pushToken` e metadados.
- Sem `pushToken`, o paciente NÃO recebe notificações.

2) **Contrato terapêutico**
- O painel exibe o contrato vigente.
- O paciente precisa aceitar os termos.
- O contrato é administrado pelo Admin e tem **controle de versão**.
- Ao publicar nova versão, o paciente deve ser notificado e obrigado a aceitar novamente.

3) **Agenda**
- Exibe:
  - Próxima sessão (destaque)
  - 3 próximas sessões (resumo)
  - Agenda completa (histórico/visão geral)
- Na sessão mais próxima:
  - há botão de WhatsApp com mensagem pronta de confirmação da consulta
  - NÃO trata cancelamento/reagendamento pelo sistema (isso exige contato ativo com a clínica)

4) **Anotações do paciente**
- O paciente pode criar notas (para levar para a sessão).
- Pode excluir notas.
- Notas ficam em `patient_notes` vinculadas ao paciente.

---

## Fluxo atual (Admin)

### Dashboard
- Visão geral: pacientes cadastrados, ativos, mensagens enviadas, etc.
- Pode ser evoluído depois (não é core agora).

### Agenda (upload de planilha)
Admin carrega planilha com campos:
- ID (patientExternalId)
- Nome
- Telefone
- Data
- Hora
- Profissional
- Serviço
- Local

Fluxo:
1) Upload
2) Verificar estrutura
3) Sincronizar (precisamos validar tecnicamente o que este botão faz hoje)
4) Gerar Preview (obrigatório para liberar envio)
5) Enviar lembretes

Regras:
- O sistema detecta quais lembretes são elegíveis com base em janelas configuráveis (ex.: 48h, 24h, 12h).
- O conteúdo das mensagens é configurável e usa placeholders: nome, profissional, data, hora, etc.

### Presença/Falta (importação de planilha)
- Filtros: 7d, 30d, 90d
- Cards:
  - Presenças
  - Faltas
  - Taxa de comparecimento (precisa validar cálculo)
  - Top 8 faltas por semana

Fluxo:
1) Importa planilha de presença/falta
2) Sistema calcula métricas (precisamos validar lógica/cálculo)
3) Admin dispara mensagens:
   - Reforço quando houve presença
   - Psicoeducação quando houve falta
Objetivo: sustentar vínculo e consistência do processo terapêutico.

### Cadastro de paciente
- Campos: Nome, Email, Telefone(WhatsApp), ID (patientExternalId)
- Mostra:
  - PUSH (se existe token/ativo)
  - Status contrato (se aceitou contrato vigente)
- Ações: editar, desativar
- Edição: ID (patientExternalId) deve permanecer estável (chave de relação).

### Histórico de envios
- Quantidade de mensagens agrupadas por dia.

### Configurações
- WhatsApp de confirmação (número e template da mensagem)
- Contrato terapêutico:
  - rascunho / publicar nova versão
  - ao publicar, notificar pacientes
  - paciente deve aceitar e isso atualiza seu status de contrato no painel
- Mensagens (MSG1/MSG2/MSG3):
  - definir horas/janelas (48h/24h/12h ou equivalente)
  - definir templates e placeholders
  - salvar config global

---

## Regras de bloqueio (Segurança clínica e operacional)
1) Paciente inativo (`users.status != active`, `deletedAt`, flags) NÃO recebe:
- lembretes de sessão
- mensagens de presença/falta
- quaisquer envios futuros

2) Sem pushToken ativo, não envia push:
- contar como `blockedNoToken`

3) Contrato não aceito:
- o paciente pode acessar o painel para ler e aceitar
- mas os envios podem ser bloqueados (decidir política: recomendado bloquear lembretes até aceite? ou apenas bloquear recursos específicos)

---

## Pontos a validar / próximos ajustes técnicos
- O que “Sincronizar” faz na prática (na Agenda)
- Como “Taxa de comparecimento” é calculada hoje
- Criar no painel Config:
  - templates de presença/falta (mensagens)
  - lógica de disparo/rotina por constância
