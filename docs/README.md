# Docs — Lembrete Psi

Este diretório concentra documentação operacional e técnica do projeto **Lembrete Psi**.  
O foco do produto é sustentar o vínculo terapêutico: **constância é cuidado**.

## Índice

> Observação: alguns números podem estar reservados para docs futuros; mantenha a sequência.

- **00** — Visão geral do produto (missão, pilares, UX do compromisso)
- **01** — Setup do projeto (Next.js App Router + Firebase)
- **02** — Variáveis de ambiente e configuração
- **03** — Deploy e ambientes
- **04** — Convenções de código e pastas
- **05** — Integrações (WhatsApp/Web Push) e limitações
- **06** — Fluxos do Admin (agenda, import, envios)
- **07** — Fluxos do Paciente (painel, push, lembretes)
- **08** — Observabilidade (logs, métricas, troubleshooting)

- **09** — Firestore Schema (snapshot estável) — `09_FIREBASE_SCHEMA.md`
- **10** — Padrão de logs em `history` — `10_HISTORY_LOGGING_STANDARD.md`
- **11** — (reservado)
- **12** — Modelo de segurança (Firestore Rules + server-side) — `12_FIRESTORE_SECURITY_MODEL.md`
- **13** — Patient Key + denormalização — `13_PATIENT_KEY_DENORMALIZATION.md`
- **14** — Pipeline de import (agenda + presença/faltas) — `14_IMPORT_PIPELINE_OVERVIEW.md`
- **15** — Spec de templates/placeholders — `15_TEMPLATE_PLACEHOLDER_SPEC.md`
- **16** — Catálogo de endpoints server-side — `16_API_ENDPOINTS_CATALOG.md`
- **17** — Guia de mensagens clínicas (tom/UX) — `17_CLINICAL_MESSAGING_GUIDE.md`
- **18** — Troubleshooting (erros comuns) — `18_TROUBLESHOOTING_COMMON_ERRORS.md`
- **19** — Métricas de constância + follow-ups — `19_CONSTANCY_METRICS_AND_FOLLOWUPS.md`
- **20** — Checklist de release (constância first) — `20_RELEASE_CHECKLIST_CONSTANCY_FIRST.md`
- **21** — Referência `config/global` — `21_CONFIG_GLOBAL_REFERENCE.md`
- **22** — UX do painel do paciente (compromisso) — `22_PATIENT_PANEL_UX_COMMITMENT_ARCHITECTURE.md`
- **23** — Notificações (máquina de estados) — `23_PATIENT_NOTIFICATIONS_STATE_MACHINE.md`
- **24** — UI do Admin (mobile-first) — `24_ADMIN_UI_CHECKLIST_MOBILE_FIRST.md`
- **25** — Guia de Firestore Rules — `25_FIRESTORE_RULES_GUIDE.md`
- **26** — Spec import presença/falta — `26_ATTENDANCE_IMPORT_SPEC.md`
- **27** — Runbook operacional — `27_OPERATIONS_RUNBOOK.md`
- **28** — Privacidade e minimização de dados — `28_DATA_PRIVACY_MINIMIZATION.md`
- **29** — Web Push (notas e troubleshooting) — `29_WEB_PUSH_PROVIDER_NOTES.md`
- **30** — Deploy e checklist de ambiente — `30_DEPLOY_ENV_CHECKLIST.md`
- **31** — Glossário (termos) — `31_GLOSSARY_TERMS.md`

- **35** — Biblioteca de frases base (Permittá) — `35_BIBLIOTECA_DE_FRASES_BASE.md`
- **36** — Atualização 2026-02-14 (resumo do chat) — `36_ATUALIZACAO_2026-02-14.md`
- **37** — Files alterados 2026-02-14 — `37_FILES_ALTERADOS_2026-02-14.md`
- **38** — Cores Permittá via skins CSS — `38_CORES_PERMITTA_SKINS.md`
- **39** — Prompt novo chat (handoff 2026-02-14) — `39_PROMPT_NOVO_CHAT_2026-02-14.md`
- **40** — Próximo passo: auditoria de resíduos de cor — `40_PASSO_21_AUDITORIA_CORES.md`

## Regras rápidas

- **Next.js App Router**: endpoints devem ser `.../route.js` (não existe `routeXXX.js`).
- **Segurança operacional**: bloqueios críticos sempre **server-side** (ex.: impedir envio a paciente inativo).
- **Firestore**
  - `config/global`: configurações (contrato, whatsapp, msg1/2/3, offsets, templates presença/falta)
  - `subscribers/{phoneCanonical}`: `pushToken` (web push)
  - `users/{uid}`: fonte de verdade (role/status)
  - `history`: schema flexível com padrão `type`, `createdAt`, `payload`

