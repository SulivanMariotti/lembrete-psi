# Contrato no Menu do Paciente

## Objetivo
Permitir que o paciente consulte o **Contrato Terapêutico** a qualquer momento (leitura futura), sem poluir o painel principal no celular.

## Decisão de UX
- O card de contrato pode continuar **oculto no mobile** quando o status está OK (para reduzir altura).
- A leitura fica sempre disponível no **Menu superior (header)**:
  - **Contrato** (abre modal com texto, versão e status).
- O contrato continua **aparecendo como pendente** e com CTA de aceite quando necessário (rodapé do `ContractStatusCard`).

## Ajuste visual
- Itens do menu mobile (Admin/Sair/Contrato) agora têm cor de fonte **mais escura** (`text-slate-800`) para boa legibilidade.

## Arquivos alterados
- `src/features/patient/components/PatientHeader.js`
- `src/components/Patient/PatientFlow.js`
