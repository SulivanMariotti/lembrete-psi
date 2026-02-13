# Atualização do projeto — 2026-02-13

## O que foi feito
- Finalização da refatoração do painel do paciente:
  - limpeza do `PatientFlow` removendo import morto
  - checklist de validação rápida (smoke checks)

## Por que isso importa
- Import morto e restos de refatoração geram ruído e aumentam chance de regressões
- Smoke checks garantem que o essencial do processo terapêutico não “quebrou”:
  - agenda → presença → contrato → notificações → notas

## Smoke checks (rápido)
1) Contrato pendente: aparece botão “Aceitar contrato” e muda estado após aceitar  
2) Contrato aceito: não exibe botão “Aceitar”  
3) Agenda com sessão futura: “Próximo atendimento” correto  
4) Agenda vazia: estado vazio OK  
5) Notificações on/off: mensagens e CTA corretos  
6) Notas: salvar e persistir após reload
