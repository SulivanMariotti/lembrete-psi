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

### Agenda (upload de planilha) — comportamento oficial

Admin carrega planilha com campos:
- ID (patientExternalId)
- Nome
- Telefone (WhatsApp)
- Data
- Hora
- Profissional
- Serviço
- Local

#### Fluxo (UI)
1) Upload
2) Verificar estrutura
3) Sincronizar
4) Gerar Preview (obrigatório para liberar envio)
5) Enviar lembretes

#### O que “Sincronizar” faz (fonte da verdade)
**Sincronizar transforma a planilha no estado atual da agenda no Firestore**, com dois efeitos:

1) **Upsert (criar/atualizar) agendamentos**
- Para cada linha válida da planilha, o sistema grava/atualiza um documento em `appointments`
- Status padrão: `scheduled`
- Metadados de origem: `source:"admin_sync"` e `sourceUploadId`

2) **Reconciliação (cancelar futuros removidos do upload)**
- Para manter consistência, se um agendamento futuro existia e **sumiu no upload atual**, ele NÃO é apagado.
- Ele é marcado como:
  - `status:"cancelled"`
  - `cancelReason:"removed_from_upload"`
  - `cancelledBy:"admin_sync"`
  - `cancelledAt`
- Isso evita enviar lembretes para sessões que não existem mais e preserva histórico.

> Observação clínica/operacional: este comportamento protege contra lembretes indevidos e reforça a confiabilidade do sistema.

#### Regras de elegibilidade de envio
Após sincronizar, o sistema calcula quais lembretes são elegíveis com base em janelas configuráveis (ex.: 48h, 24h, 12h) e só libera o envio após “Gerar Preview”.


### Presença/Falta (importação de planilha)
- Filtros: 7d, 30d, 90d
- Cards:
  - Presenças
  - Faltas
  - Taxa de comparecimento (precisa validar cálculo)
  - Top 8 faltas por semana
  
#### Taxa de comparecimento (cálculo atual)
A taxa é calculada como:
**presenças ÷ (presenças + faltas) × 100**
considerando apenas registros normalizados como `present` e `absent` no período selecionado (7d/30d/90d).

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
