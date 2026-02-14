# Arquivos mexidos hoje (referência rápida)

> Use como checklist para auditoria/merge.

## Contrato
- `src/hooks/useData.js`

## Push paciente (sem permission-denied)
- `src/components/Patient/PatientFlow.js`
- (rotas) `src/app/api/patient/push/status/route.js`
- (rotas) `src/app/api/patient/push/register/route.js`

## Resolver telefone
- `src/app/api/patient/resolve-phone/route.js`
- `src/components/Patient/PatientFlow.js`

## Histórico Admin
- `src/hooks/useData.js`
- `src/components/Admin/AdminHistoryTab.js`

## Admin → Pacientes (flags + contrato + código)
- `src/components/Admin/AdminPatientsTab.js`
- `src/components/Admin/AdminPanelView.js`
- `src/app/api/admin/patients/list/route.js`

## Login por Código de Vinculação
- `src/app/api/admin/patient/pair-code/route.js`
- `src/app/api/patient/pair/route.js`
- `src/services/authService.js`
- `src/components/Patient/PatientLogin.js`
