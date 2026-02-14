# 21_CONFIG_GLOBAL_REFERENCE

Referência dos campos do documento **`config/global`** no Firestore.

Objetivo: manter configuração centralizada e previsível.  
Quando configuração quebra, o lembrete falha — e quando o lembrete falha, a constância fica mais frágil.

> Sem dados sensíveis: este documento lista **nomes de campos e tipos**.

---

## 1) Estrutura

- Coleção: `config`
- Documento: `global`
- Tipo: documento único (singleton) com chaves estáveis

---

## 2) Campos principais (mensagens e janelas)

### 2.1 WhatsApp (envio)
- `whatsappEnabled` (boolean) *(se existir no projeto)*
- `whatsappFrom` (string) *(id/number do remetente, se aplicável)*
- `whatsappQuietHoursStart` (string `HH:mm`) *(opcional)*
- `whatsappQuietHoursEnd` (string `HH:mm`) *(opcional)*
- `whatsappMaxPerBatch` (number) *(opcional)*

> Observação: bloqueios críticos (paciente inativo / janela proibida) devem estar **server-side**.

### 2.2 Lembretes de agenda (msg1/2/3)

> Observação: `msgXTitle` é usado para canais de texto (ex.: WhatsApp). Para **Push**, ver 2.3.

- `msg1Title` (string) *(opcional)*
- `msg1Body` (string)
- `msg2Title` (string) *(opcional)*
- `msg2Body` (string)
- `msg3Title` (string) *(opcional)*
- `msg3Body` (string)

Offsets (tempo antes da sessão):
- `msg1OffsetHours` (number) *(ex.: 48)*
- `msg2OffsetHours` (number) *(ex.: 24)*
- `msg3OffsetHours` (number) *(ex.: 8 ou “manhã da sessão”)*

### 2.3 Títulos de Push (lembretes)

Esses títulos aparecem nas **notificações do paciente**.  
O **corpo** do texto continua vindo dos templates `msg1/2/3`.

- `reminderTitlePrefix` (string) *(ex.: `💜 Permittá • Lembrete Psi — `)*
- `reminderTitle1` (string) *(sufixo do título do lembrete 48h / slot1)*
- `reminderTitle2` (string) *(sufixo do título do lembrete 24h / slot2)*
- `reminderTitle3` (string) *(sufixo do título do lembrete “hoje” / slot3)*
- `reminderTitleDefault` (string) *(fallback)*
- `reminderTitleMulti` (string) *(título para pacote “misto”; pode ser **título completo**)*

> Regra: se `reminderTitleMulti` estiver vazio, o sistema usa `reminderTitlePrefix + "Seus lembretes"`.

### 2.4 Presença/Falta (follow-ups)
- `attendanceFollowupPresentTitle` (string)
- `attendanceFollowupPresentBody` (string)
- `attendanceFollowupAbsentTitle` (string)
- `attendanceFollowupAbsentBody` (string)

Placeholders suportados:  
`{nome}`, `{data}` (DD/MM/AAAA), `{dataIso}`, `{hora}`, `{profissional}`, `{servico}`, `{local}`, `{id}`  
Compatível com legado `{{nome}}`.

---

## 3) Contrato / comunicação clínica

Campos típicos (ajuste ao seu projeto):
- `contractPolicyText` (string) *(texto curto de política/contrato)*
- `clinicName` (string)
- `clinicPhone` (string) *(opcional)*
- `supportWhatsapp` (string) *(opcional)*

> Tom recomendado: firme e acolhedor.  
> “Seu horário é um espaço de cuidado. A continuidade faz diferença.”

---

## 4) Auditoria e versão (recomendado)

- `updatedAt` (timestamp)
- `updatedBy` (string uid/email) *(opcional)*
- `schemaVersion` (number) *(opcional)*

---

## 5) Regras de edição (produto)

- Alterar templates não deve exigir deploy.
- Previews (dryRun) devem sempre refletir `config/global` atual.
- Sempre logar mudanças relevantes em `history`:
  - `type`: `config.global.updated`
  - `payload`: lista de campos alterados (sem valores se forem sensíveis)

