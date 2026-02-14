# Decisões técnicas (fonte da verdade)

## Identidade do paciente (chaves)
- Doc real do paciente: `users/{uid}`
- Chave externa estável: `patientExternalId` (ID do seu sistema interno)
- Telefone canônico: `phoneCanonical` (apenas dígitos)

**Decisão:** `patientExternalId` é a chave de integração e deve ser imutável na UI.
Ele deve permitir relacionar:
- appointments importados
- relatórios de presença/falta
- histórico de envios
- status de contrato

## Coleções (modelo mental)
- `users`: cadastro/estado do paciente (fonte de verdade)
- `appointments`: agenda importada (deve trazer patientExternalId e phoneCanonical idealmente)
- `subscribers`: estado do dispositivo/push por `subscribers/{phoneCanonical}` (pushToken, lastSeen, isActive)
- `patient_notes`: notas do paciente (patientId == uid)
- `history`: logs admin (admin-only)
- `config`: configurações globais (templates, janelas, contrato, whatsapp)

## Contrato com versionamento
- `config/global` (ou equivalente) deve manter:
  - `contractVersion`
  - `contractPublishedAt`
  - `contractHtml` (ou markdown)
- Em `users/{uid}`:
  - `contractAcceptedVersion`
  - `contractAcceptedAt`
- Regra: se `contractAcceptedVersion < contractVersion`, o painel exige novo aceite.

## Templates de mensagens e janelas
Config global deve conter:
- janelas (ex.: 48h/24h/12h ou horários absolutos)
- templates com placeholders:
  - {nome}, {data}, {hora}, {profissional}, {servico}, {local}

## Push: regra operacional
- Push só envia se `subscribers/{phoneCanonical}.pushToken` existir e `isActive != false`.
- Ativação de push é feita pelo paciente no painel.

## Bloqueio de inativos (server-side obrigatório)
Antes de enviar qualquer notificação:
- consultar paciente em `users` (por uid ou patientExternalId/phoneCanonical)
- se inativo: bloquear e retornar contadores `blockedInactive`
Isso evita envio mesmo se alguém tentar forçar pelo front.

## UX (clínico)
- Sem botão “Cancelar sessão”
- Sem “Confirmar presença” como condição para a sessão existir
- **Painel do paciente:** uso exclusivo para lembrar da sessão e conscientizar presença/constância.
  - **Não** exibir mensagens do tipo “avise com antecedência”.
  - **Não** oferecer atalhos de contato (ex.: WhatsApp) na Agenda que facilitem cancelamento/remarcação.
  - Se existir WhatsApp no produto, apenas para **reforço de compromisso/confirmar presença**, nunca como CTA de cancelamento/remarcação.

## Branding (Permittá) via skins CSS
- Estratégia de baixo risco: aplicar tema por escopo com `.skin-patient` e `.skin-admin`.
- Mapeia classes `violet-*` → `brand-*` somente dentro do skin.
- Alertas (erro/aviso/sucesso) permanecem `red/amber/green`.
- Detalhes: `docs/38_CORES_PERMITTA_SKINS.md`.
