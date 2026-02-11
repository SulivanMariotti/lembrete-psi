# 27_OPERATIONS_RUNBOOK

Runbook operacional do **Lembrete Psi** para manter o sistema funcionando sem “surpresas” que virem falhas de lembrete.

> Clínica: falha operacional vira falha de cuidado ativo.  
> Falha de lembrete aumenta chance de falta. E falta interrompe evolução.

---

## 1) Rotina diária (Admin)

- [ ] Conferir se import de agenda do dia/semana está atualizado
- [ ] Rodar dryRun de envios pendentes (msg1/2/3) e verificar `blockedReason`
- [ ] Verificar pacientes inativos (se houve desligamentos recentes)
- [ ] Conferir se houve erros no `history` relacionados a envio

---

## 2) Rotina semanal

- [ ] Importar presença/falta (se usar planilha externa)
- [ ] Atualizar painel de constância (métricas 30/60/90 dias)
- [ ] Executar follow-ups (presença/falta) com dryRun antes

---

## 3) Quando algo “sumiu” no Admin (fluxo quebrado)

### 3.1 Upload não recarrega após “Limpar”
- Verificar reset completo do state
- Garantir troca de `key` do `<input type="file">`

### 3.2 Preview não mostra amostras
- Confirmar que o endpoint retorna `sample` mesmo quando bloqueado (com `blockedReason`)
- Confirmar interpolação de placeholders (ver doc 15)

---

## 4) Quando o paciente não recebe lembrete

Checklist rápido (ordem):

1. `users/{uid}.status` é `"active"`?
2. `users/{uid}.phoneCanonical` existe e bate com `subscribers/{phoneCanonical}`?
3. `subscribers/{phoneCanonical}.pushToken` existe?
4. O browser do paciente está com permissão `"granted"`?
5. DryRun no Admin mostra `blockedNoToken` ou `blockedInactive`?
6. Há logs em `history` com `push.send.failed`?

Ação clínica (texto sugerido para contato humano):
- “Percebi que seus lembretes podem não estar chegando. Vamos ajustar isso para proteger sua constância — seu horário é um espaço de cuidado.”

---

## 5) Quando aparece `permission-denied`

- Validar consistência de `phoneCanonical` (doc 13)
- Confirmar que o painel do paciente resolve/define telefone via rota server-side (se aplicável)
- Revisar rules (doc 25) e bloquear decisões críticas server-side

---

## 6) Padrão de logs obrigatórios em incidentes

Sempre registrar em `history`:
- `type`: `incident.opened`, `incident.resolved`
- `payload`:
  - `area` (admin/patient/push/import)
  - `symptom` (texto curto)
  - `rootCause` (texto curto)
  - `fixCommit` (hash/descrição)
  - `followUp` (o que evitar no futuro)

Sem dados sensíveis.

---

## 7) Critérios de “ok para operar”

- DryRun sem erros e com contagens coerentes
- Paciente de teste ativo consegue:
  - abrir painel
  - ver próxima sessão
  - ativar notificações (quando permitido)
- Envios bloqueados (quando necessário) aparecem com motivo

