# Lembrete Psi — Onde paramos

Data: **2026-02-13**

## Missão (produto)
Sustentar o vínculo terapêutico e reduzir faltas pela **constância**:
- lembretes automáticos (48h, 24h, manhã)
- psicoeducação no painel do paciente
- responsabilização (contrato, constância, histórico/auditoria)
- UX deliberada (sem “cancelar sessão” fácil; sessão como contrato)

---

## Estado atual (confirmado)

### ✅ Painel do Paciente (refatoração concluída + mobile compacto)
Refatoração para componentes em `src/features/patient/components/`:
- `ContractStatusCard`
- `PatientMantraCard`
- `PatientNotificationsCard` (compacto, mobile-friendly)
- `PatientSessionsCard` (próximo atendimento + agenda)
- Estados reutilizáveis: `InlineLoading`, `EmptyState`, `InlineError`

Ajustes finais:
- Mobile mais compacto (menos scroll)
- Contrato **fica oculto no mobile** quando aceito (decisão de UX)
- “Seu Próximo Atendimento” com **destaque sutil** e layout revisado para legibilidade no celular

### ✅ Backlog — Item 1 (Presença/Faltas Admin)
Marcado como **concluído**:
- preview `sample` no `dryRun`
- “Limpar” → reprocessar sem travar estado
- “Disparos por constância” consistente
- 2ª planilha/relatório para painel de constância + followups
- UI upload CSV como botão

---

## Próximo passo (prioridades)

### A) (Opcional) Capacitor (APP mantendo WEB)
Decisão técnica já documentada: **Capacitor Opção A** (shell nativo apontando para a URL do Vercel).
➡️ Guia em: `docs/14_NEXT_STEP_CAPACITOR.md`

### B) (Se adiar o APP) Padronizar chave do paciente e modelo NoSQL
Para reduzir `permission-denied` e duplicidades de paciente:
- Padrão oficial: `phoneCanonical` **SEM 55** (DDD + número)
- Documento de referência: `docs/13_PATIENT_KEY_DENORMALIZATION.md`
- Checklist de diagnóstico: `docs/18_TROUBLESHOOTING_COMMON_ERRORS.md`
