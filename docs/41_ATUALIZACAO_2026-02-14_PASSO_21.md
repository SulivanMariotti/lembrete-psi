# Atualização — 2026-02-14 (Passo 21)

## Passo 21 — Auditoria de resíduos de cor (Permittá)

### Objetivo
Eliminar classes de cor **fora do padrão** (Permittá via skins + neutros + alertas) que ainda restavam em `src/`.

### Varredura
Busca manual/grep em `src/` por ocorrências de cores que não fazem parte do padrão atual:
- `blue-*`, `sky-*`, `orange-*`, `indigo-*`, `purple-*`, gradientes (`from/to/via-*`) e indícios de `fill/stroke` hardcoded.

### Ocorrências encontradas (3)
1) `src/components/DesignSystem.js`
   - `Badge` para `status === 'time' || 'pending'` usava `bg-blue-* / text-blue-* / border-blue-*`.

2) `src/components/Admin/AdminPatientsTab.js`
   - `IndicatorPill(kind === 'contract')` usava:
     - OK: `bg-sky-* / text-sky-* / border-sky-*`
     - NÃO OK: `bg-orange-* / text-orange-* / border-orange-*`

### Correções aplicadas
1) `src/components/DesignSystem.js`
   - `time/pending` → neutros Permittá (estrutura/estado não-alarme)
     - de: `bg-blue-50 text-blue-600 border-blue-100`
     - para: `bg-slate-50 text-slate-700 border-slate-100`

2) `src/components/Admin/AdminPatientsTab.js`
   - `contract` → semântica por alerta (regra do produto)
     - contrato OK → `emerald-*` (positivo)
     - contrato pendente/ausente → `amber-*` (atenção)

### Por que assim
- `time/pending` não é erro nem sucesso: entra como **estado informativo** e deve ficar em **neutros**.
- Contrato é um marcador operacional de vínculo/termo:
  - OK = **concluído** (verde)
  - não OK = **requer atenção** (âmbar)
- **Alertas preservados** (nenhuma troca em `red/amber/emerald` fora do necessário).

### Arquivos alterados
- `src/components/DesignSystem.js`
- `src/components/Admin/AdminPatientsTab.js`
- `docs/40_PASSO_21_AUDITORIA_CORES.md`
- `docs/39_PROMPT_NOVO_CHAT_2026-02-14.md`

### Checklist rápido de validação
- Admin → Aba Pacientes: pills de contrato (OK / pendente) 
- Admin/Paciente: onde `Badge` é usado com `status='time'` ou `status='pending'`
- Verificar contraste no mobile e em dark/normal (se houver)
