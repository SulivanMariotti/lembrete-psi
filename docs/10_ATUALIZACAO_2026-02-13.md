# Atualização do projeto — 2026-02-13

## O que foi feito
- Continuidade da refatoração do painel do paciente (PatientFlow) com foco em mobile:
  - Criado `PatientNotificationsCard` e integrado no `PatientFlow`
  - Removido wrapper externo pesado para reduzir altura/“espaço perdido”

## Por que isso importa (visão clínica/UX)
- O paciente precisa encontrar rapidamente:
  - se as notificações estão ativas
  - como ativar quando não estiver
- Quanto menos fricção e mais clareza, maior a chance de constância e presença.

## Próximo alvo
- Step 9.3.13: agenda/sessões em componente próprio com layout compacto no celular.
