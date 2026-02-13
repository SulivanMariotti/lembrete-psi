# Lembrete Psi — Arquivos alterados (2026-02-13)

## Principais arquivos atualizados
- `src/components/Patient/PatientFlow.js`
  - Redução progressiva do JSX e da lógica
  - Passou a renderizar componentes do domínio `features/patient`
  - Hotfixes aplicados para corrigir erros de parsing e import duplicado

## Novos componentes (UI)
- `src/features/patient/components/Skeleton.js`
- `src/features/patient/components/PatientHeader.js`
- `src/features/patient/components/NextSessionCard.js`
- `src/features/patient/components/NotificationStatusCard.js`
- `src/features/patient/components/PatientAgendaCard.js`
- `src/features/patient/components/AppointmentMiniRow.js`
- `src/features/patient/components/PatientNotesCard.js`
- `src/features/patient/components/ContractStatusCard.js`

## Novos hooks (dados)
- `src/features/patient/hooks/usePushStatus.js`
- `src/features/patient/hooks/useAppointmentsLastSync.js`
- `src/features/patient/hooks/usePatientAppointments.js`
- `src/features/patient/hooks/usePatientNotes.js`

## Novas libs (utilitários)
- `src/features/patient/lib/phone.js`
- `src/features/patient/lib/dates.js`
- `src/features/patient/lib/ics.js`
- `src/features/patient/lib/appointments.js`

---

## Observação
Se algum arquivo acima não existir no seu repositório local, significa que a extração (criação de pasta) ainda não foi aplicada ou foi criada em caminho diferente. Nesta refatoração, o padrão é:
- `src/features/patient/...` para tudo do paciente.
