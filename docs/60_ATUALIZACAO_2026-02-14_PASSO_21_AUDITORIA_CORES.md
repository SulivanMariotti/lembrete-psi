# ATUALIZAÇÃO — PASSO 21 — Auditoria de resíduos de cor — 2026-02-14

## Objetivo
Remover classes/cores remanescentes fora do padrão Permittá e manter alertas (red/amber/emerald) intactos.

## Achados
- `blue-*` em Badge (DesignSystem)
- `sky-*` e `orange-*` em pills de contrato (Admin)

## Ajustes
- `blue-*` → neutros (slate) para estados informativos.
- contrato OK → `emerald-*`
- contrato pendente → `amber-*`

## Resultado
Interface consistente com paleta e linguagem clínica (brand para acolhimento; alertas apenas quando necessário).
