# Lembrete Psi — Onde paramos

<<<<<<< HEAD
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
=======
Data: 2026-02-11

## Objetivo do projeto
Reduzir faltas e sustentar o vínculo terapêutico com:
- lembretes automáticos (48h, 24h, manhã)
- psicoeducação no painel do paciente
- responsabilização (constância, histórico, transparência)
- UX deliberada (sem “cancelar sessão” fácil; sessão como contrato)

## Estado atual (confirmado)

### ✅ Contrato Terapêutico (Paciente)
- O **Contrato Terapêutico** é definido em `config/global` (`contractText`, `contractVersion`) via Admin → Configurações.
- O painel do paciente agora **carrega o contrato** corretamente (não depende do modo Admin).
- Aceite do contrato grava no `users/{uid}`:
  - `contractAcceptedVersion` (number, opcional)
  - `contractAcceptedAt` (timestamp, opcional)
- No Admin → Pacientes, contrato aparece como **Aceito/Pendente** (separado do “Cadastro ativo”).

### ✅ Notificações (Push) — sem permission-denied
- O paciente **não lê** `subscribers/{phoneCanonical}` direto do Firestore.
- Status/registro de push passam a usar **somente**:
  - `GET /api/patient/push/status`
  - `POST /api/patient/push/register`
- Rota `GET /api/patient/resolve-phone` resolve telefone quando ausente e evita erro “Seu telefone ainda não está disponível…”.

### ✅ Histórico (Admin) — leitura robusta
- O Admin lê `history` com fallback:
  - `sentAt` ← `sentAt || createdAt || payload.sentAt || payload.createdAt`
  - `createdAt` ← `createdAt || sentAt || payload.createdAt || payload.sentAt`
- A lista ordena por `(sentAt || createdAt)` no client.
- Badge do tipo virou **nome amigável** (PT-BR) e mantém o `type` técnico no hover.

### ✅ Admin → Pacientes (layout)
- Colunas com “flags/pílulas”:
  - **Cadastro** (ativo/inativo)
  - **Contrato** (aceito/pendente)
  - **Notificações** (ativas/ausentes)
- A rota Admin de listagem agora inclui status de contrato no payload da lista.

### ✅ Documentação do schema
- `docs/10_FIREBASE_SCHEMA.md` é a **fonte oficial** do snapshot do schema.
- `docs/09_FIREBASE_SCHEMA.md` funciona como resumo/índice (se existir no seu repo).

---

## O que foi feito hoje (resumo técnico)
> Lista para referência rápida — **sem colar código**.

1) **Contrato não carregava no paciente**
- Ajuste em `src/hooks/useData.js` para sempre carregar `globalConfig` (Admin e Paciente).

2) **Histórico (Admin) com createdAt/sentAt**
- Ajustes em:
  - `src/hooks/useData.js`
  - `src/components/Admin/AdminHistoryTab.js`

3) **Histórico com nomes amigáveis**
- Ajuste em `src/components/Admin/AdminHistoryTab.js` (map de `type` → label PT-BR).

4) **Admin → Pacientes com flags (Push/Status)**
- Ajuste em `src/components/Admin/AdminPatientsTab.js`

5) **Separar “Cadastro” vs “Contrato” no Admin**
- Ajustes em:
  - `src/app/api/admin/patients/list/route.js`
  - `src/components/Admin/AdminPanelView.js`
  - `src/components/Admin/AdminPatientsTab.js`

6) **Notificações do paciente sem permission-denied**
- Ajuste em `src/components/Patient/PatientFlow.js` para usar APIs server-side (sem `onSnapshot` em `subscribers`).

7) **Resolver telefone automaticamente**
- Ajuste em `src/app/api/patient/resolve-phone/route.js` + uso no `PatientFlow`.

8) **Decisão de produto (APP)**
- Avaliado Capacitor; decidido **manter Web por enquanto**.
- Item adicionado ao backlog: **retomar login seguro do paciente** antes de pensar em PWA/App.

---

## Pendências (prioridade alta)
- Revisar Admin → **Presença/Faltas** (preview/amostra + fluxo de reprocessar planilha sem “estado preso”).
- Consolidar estratégia para deduplicar `users` por email/phoneCanonical (evitar doc sem telefone).
- Futuro: endurecer autenticação do paciente (magic link/OTP) antes de publicar PWA/App.

## Próximo passo sugerido (1 por vez)
**Próximo passo (1/1):** atacar Admin → **Presença/Faltas**:
- garantir que `Amostra` (sample) seja preenchida no preview (dryRun)
- corrigir fluxo “Limpar” + reprocessar planilha
- garantir que a seção “Disparos por constância” apareça consistentemente
>>>>>>> c66289ccbe833c158649430e3e54b0587f907b5c
