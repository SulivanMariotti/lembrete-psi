# Lembrete Psi — Onde paramos

Data: **2026-02-13**

> Este arquivo espelha o `00_ONDE_PARAMOS.md` para manter compatibilidade com históricos antigos de docs.

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

## Próximo passo (prioridade): Capacitor (APP mantendo WEB)
**Decisão técnica:** começar com **Capacitor Opção A** (shell nativo apontando para a URL do Vercel).
- ✅ WEB via browser continua normalmente
- ✅ APP Android/iOS abre a mesma URL (WebView)
- Mantém SSR e rotas `/api` funcionando (sem precisar “exportar estático”)

➡️ Guia em: `docs/14_NEXT_STEP_CAPACITOR.md`
