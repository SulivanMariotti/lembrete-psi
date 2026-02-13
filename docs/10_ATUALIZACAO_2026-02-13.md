# Atualização do projeto — 2026-02-13

## O que foi feito
- Refatoração do painel do paciente (**PatientFlow**), extraindo 3 blocos em componentes:
  1. **Contrato Terapêutico** → `ContractStatusCard`
  2. **Mantra/Psicoeducação** → `PatientMantraCard`
  3. **Identificação (nome/telefone)** → `PatientContactCard`

## Por que isso é importante (visão clínica/UX)
- Reduz o “ruído” da tela e reforça mensagens-chave:
  - **O segredo da terapia é a constância**
  - O horário do paciente é um **espaço de cuidado**
- Torna o código mais modular e menos propenso a regressões em alterações futuras.

## Problemas encontrados e correções
- `Identifier 'ContractStatusCard' has already been declared`  
  → import duplicado no `PatientFlow.js`.
- `Module not found: Can't resolve ...PatientMantraCard`  
  → arquivo ausente no caminho certo ou extensão errada (ex.: `.js.txt`).
- `Module not found: Can't resolve ...PatientContactCard`  
  → mesmo cenário do item acima.

## Próximo alvo
- Step 9.3.12: extrair e compactar **Notificações/Checklist** (melhorar mobile).
