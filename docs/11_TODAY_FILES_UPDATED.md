# Arquivos mexidos hoje (referência rápida)

> Este arquivo serve só para facilitar retomada no próximo chat.

## Fixes / Melhorias aplicadas (2026-02-11)

### Contrato Terapêutico no paciente
- `src/hooks/useData.js`

### Histórico (Admin)
- `src/hooks/useData.js`
- `src/components/Admin/AdminHistoryTab.js`

### Histórico com “tipo” amigável (PT-BR)
- `src/components/Admin/AdminHistoryTab.js`

### Admin → Pacientes (flags)
- `src/components/Admin/AdminPatientsTab.js`

### Admin → Pacientes (Contrato aceito/pendente)
- `src/app/api/admin/patients/list/route.js`
- `src/components/Admin/AdminPanelView.js`
- `src/components/Admin/AdminPatientsTab.js`

### Push (Paciente) sem permission-denied
- `src/components/Patient/PatientFlow.js`

### Resolver telefone automaticamente
- `src/app/api/patient/resolve-phone/route.js`
- `src/components/Patient/PatientFlow.js`

## Observação
- Decisão: manter Web por enquanto; Capacitor/PWA ficam para futuro.
- Item futuro: reintroduzir autenticação/login seguro do paciente (magic link/OTP) antes de publicar APP.
