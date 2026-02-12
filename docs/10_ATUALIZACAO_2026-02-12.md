# Atualização — 2026-02-12 (Presença/Faltas + Constância)

## O que foi feito

### 1) Admin → Presença/Faltas (Planilha)
- Fluxo completo: Upload CSV → Verificar (dryRun) → Importar → Limpar
- Cabeçalho aceito: `ID, NOME, DATA, HORA, PROFISSIONAL, SERVIÇOS, LOCAL, STATUS`
- `STATUS` opcional (fallback para “status padrão” do Admin)
- Separador `,` ou `;`
- Validação com:
  - **Erros** (bloqueiam linha): ID vazio, DATA/HORA inválidas, duplicada no arquivo
  - **Avisos** (não bloqueiam): campos vazios, status desconhecido, sem phoneCanonical
- Download: **Baixar inconsistências (CSV)** (erros + avisos com `field`, `line`, `message`, `rawLine` etc.)
- UX: upload virou **botão** (“Selecionar arquivo”) e exibe nome do arquivo

### 2) Disparos por Constância (followups)
- dryRun passou a retornar `sample` mesmo com bloqueios (para validar placeholders/mensagens)
- Resolve telefone por `patientId` consultando `users.patientExternalId` (ou `users.patientId`)
- Novos contadores: `blockedNoPhone`, `blockedNoToken`, `blockedInactive...`
- `sample[]` mostra `canSend` + `blockedReason`

### 3) Admin: refresh após import
- Depois de importar presença/faltas, o Admin atualiza o painel/estatísticas sem precisar trocar de menu.

---

## Arquivos impactados (principais)
- `src/app/api/admin/attendance/import/route.js`
- `src/components/Admin/AdminAttendanceImportCard.js`
- `src/app/api/admin/attendance/send-followups/route.js`
- `src/components/Admin/AdminPanelView.js`
- (apoio UI) `src/components/Admin/AdminAttendanceTab.js`

---

## Como validar rapidamente
1) Admin → Presença/Faltas:
   - Selecionar CSV → Verificar
   - Checar: resumo, erros/avisos e botão “Baixar inconsistências”
2) Importar:
   - Checar: contagens e atualização imediata do painel
3) Disparos por Constância:
   - rodar dryRun e checar `sample[]` com `blockedReason` quando aplicável

---

## Próximo passo sugerido (1 por vez)
- “Baixar preview normalizado (CSV)” do dryRun (todas as linhas processadas, já normalizadas), para auditoria antes de gravar.

---

## Sugestão de commit
`feat(attendance): upload+validate CSV, warnings & issues export; fix followups sample; refresh after import`
