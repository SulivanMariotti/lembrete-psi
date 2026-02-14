# PROMPT — Novo Chat (continuar Lembrete Psi) — 2026-02-14

Você está no projeto **Lembrete Psi** (Next.js 16 + Firebase). Aja como **dev master full-stack + olhar clínico**.

## Regras de trabalho
1) Sempre **passo a passo (1 por 1)**. Só avance quando eu disser **OK**.  
2) Sempre que houver alteração de código/docs, entregue **arquivo completo em .zip** com link (não colar código).  
3) Se precisar analisar algo e estiver desatualizado, peça **upload do arquivo mais atual**.

## Diretriz central (Paciente)
- Painel do paciente existe para **lembrar da sessão** e reforçar **presença/constância**.
- **Não** criar botão/CTA de cancelar/remarcar.
- **Não** exibir “avise com antecedência”.
- **Não** oferecer atalhos de contato na Agenda que facilitem cancelamento/remarcação.
- WhatsApp (se existir): apenas **reforço de compromisso/confirmar presença**, nunca cancelamento/remarcação.

## Status consolidado (Passos 1–20)
- Paciente: header limpo; “próximo atendimento” destacado; contrato fica no menu; agenda mobile corrigida; diário rápido com chips + autosave; diário com preview + histórico modal + busca; contexto da próxima sessão; pin de destaque via localStorage.
- Admin: Dashboard centrado em Constância (30 dias) + ações rápidas + alerta 2+ faltas; período (7/30/90) persistido; exibe nome/telefone + copiar.
- Branding Permittá: skins `.skin-patient`/`.skin-admin` aplicadas; alertas preservados.
- Docs: biblioteca de frases base + resumo + passo de auditoria de cores.

---

# Passos executados após isso

## PASSO 21 — Auditoria de resíduos de cor
- Varredura em `src/` por `text-blue-*`, `bg-sky-*`, `orange-*`, etc.
- Ajustes pontuais para **neutros/brand** e alertas (emerald/amber) quando pertinente.

## PASSO 22 — Admin separado em `/admin`
- `/` virou **somente paciente** (sem CTA Admin).
- `/admin` virou **somente admin** (senha → `/api/auth` → custom token → AdminPanel).
- Removeu “Admin” de PatientLogin/PatientHeader/PatientFlow.

## PASSO 23 — Branding no menu Admin
- Sidebar Admin com **logo + “Lembrete Psi” + subtítulo + chip Admin** (padrão paciente).

## PASSO 24 — Branding na tela Acesso Admin
- `/admin` com cabeçalho padronizado (logo + título + chip Admin).

## PASSO 25 — Gate de produção (segurança)
- **Bloqueadores encontrados:** rotas sensíveis sem auth / segredo público; `.env.local` e arquivos sensíveis sem `.gitignore`.
- **25.3 aplicado:** padrão **Authorization Bearer idToken + verifyIdToken + claim admin** em rotas sensíveis.
- `.gitignore` adicionado; secrets migrados para ENV na Vercel.
- Ajuste de env: `FIREBASE_ADMIN_SERVICE_ACCOUNT_B64`, `ADMIN_UID`, `ADMIN_PASSWORD`.
- Hotfix build (route register): variável `auth` duplicada corrigida.

## PASSO 26 — Backup local sem custo
- Adicionado `npm run backup:local` (gera dump compactado em `./backups/`).
- `backups/` ignorado no git.
- Rotina sugerida: semanal, manter 8 semanas.

## PASSO 27 — Saúde do Sistema (Admin)
- Card “Saúde do Sistema” no Dashboard Admin.
- Backup local registra timestamp em Firestore e aparece no card.

## PASSO 28 — Rate limit + Audit log
- Rate limit best-effort (in-memory) em rotas admin e endpoints sensíveis.
- Audit log em `audit_logs` para ações críticas.
- Hotfix build: duplicidade `rl` em `patients/list` corrigida.

## PASSO 28.2 — Aba Auditoria no Admin
- Nova aba para visualizar `audit_logs` com filtros/busca/paginação.
- Hotfix: arquivo `AdminAuditTab` e rota `/api/admin/audit/list` adicionados.

## PASSO 29.1 — Contenção de danos (patch entregue)
- CORS restrito para rotas admin (aceitar apenas origem do domínio).
- Retry seguro no Admin (mensagens genéricas para usuário).
- Fail-safe: registrar `audit_logs` com `status=error` + `requestId` quando falhar.

---

## Próximo passo sugerido
- **PASSO 29.2**: validar em produção (CORS/origin, erros padronizados, fail-safe) e ajustar edge-cases.
