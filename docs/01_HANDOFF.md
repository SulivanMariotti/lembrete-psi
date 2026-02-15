# Lembrete Psi — Handoff para novo chat (2026-02-14)

Este arquivo serve para **iniciar um novo chat** e continuar o desenvolvimento **exatamente de onde paramos**.

---

## Contexto do projeto
- App: **Lembrete Psi**
- Stack: **Next.js (App Router) + Firebase (Firestore/FCM)**
- Princípios clínicos/UX (painel do paciente):
  - Foco: **lembrar, psicoeducar e responsabilizar**.
  - Evitar CTAs que facilitem cancelamento/remarcação (sem botão “cancelar”, sem “falar no WhatsApp” para cancelar).
  - Mensagens devem reforçar **constância/consistência**: faltar interrompe processo terapêutico.

---

## Onde paramos
- Último passo aplicado: **Passo 13.1** (corrigir caracteres unicode exibidos como `\u00...` no Histórico).
- Área trabalhada: **Painel Admin**
  - Aba **Pacientes**: compactação + filtros + performance + paginação cursor + busca inteligente.
  - Aba **Histórico**: rolagem, filtros, busca, modal de detalhes, paginação, falhas de envio e agrupamento por campanhas.

➡️ **Próximo passo sugerido:** **Passo 14** (ver seção “Próximos passos”).

---

## Checklist para retomar em novo chat
1. **Anexar o zip mais atualizado** do projeto no novo chat.
2. Anexar também estes .md (ou o zip do pack) para contexto.
3. Pedir: “Continuar do **Passo 14**”.

---

## Resultado esperado das mudanças já aplicadas
### Admin → Pacientes
- Tabela com **padrão 8 linhas visíveis** e **rolagem interna**.
- Botões e badges **compactos**.
- Filtros:
  - **Sem Push**
  - **Sem Contrato aceito**
  - **Sem Código**
- Performance:
  - Enriquecimento de Push com **leituras em lote**.
  - Paginação por **cursor** (Carregar mais) e metas 500/1000/2000 sem travar.
- Busca inteligente (server-side) quando buscar por:
  - telefone (somente dígitos),
  - e-mail,
  - id externo (quando tem dígitos e/ou `_`/`-`).

### Admin → Histórico
- **Rolagem interna** (sem esticar a página).
- Filtros por período (Hoje/7/30/Tudo) + tipo (Erros/Lembretes/Constância/Agenda/Pacientes/Push).
- Busca local (texto/telefone/e-mail quando presente no resumo).
- Modal “Detalhes” por item (copiar resumo e JSON).
- Paginação (mostra 200, “Carregar mais”).
- Filtro “Falhas de envio” + modo “Campanhas” (48h/24h/Hoje/Misto/Disparo/Sem slot).
- Correção de labels exibindo unicode (acentos agora aparecem corretamente).

---

## Arquivos alterados (consolidado)
> Observação: a cada passo foi entregue **somente os arquivos alterados**.

### Firestore
- `firestore.rules` — hotfix para eliminar `permission-denied` do paciente (fallback por claim `request.auth.token.phoneCanonical`).

### Admin → Pacientes
- `src/components/Admin/AdminPatientsTab.js`
- `src/app/api/admin/patients/list/route.js`

### Admin → Histórico
- `src/components/Admin/AdminHistoryTab.js`

### Design System (fix estrutural de rolagem)
- `src/components/DesignSystem.js` — adicionar `min-h-0` no Card wrapper para permitir `overflow-y-auto` funcionar dentro de flex.

---

## Próximos passos (Passo 14 em diante)
### Passo 14 (recomendado): Logs de falha com “slot” (48/24/Hoje) consistente
- Hoje: algumas falhas individuais podem cair em “Sem slot”.
- Melhorar: ao registrar `push_reminder_failed`, também registrar `reminderType/slot`.
- Resultado: agrupamento “Campanhas” fica 100% fiel e ajuda a detectar problemas operacionais que impactam a constância.

### Passo 15: Indexação/consultas para histórico (server-side opcional)
- Se o histórico crescer muito, fazer endpoint com cursor + filtros server-side para reduzir payload no Admin.

### Passo 16: Padronização final de UI
- Revisar micro-espaçamentos e alinhamentos no Admin (Pacientes/Histórico/Dashboard) mantendo o padrão visual do sistema.

---

## Notas rápidas
- Usuária desenvolve em **Windows** com Android Studio/Emulador (plano Capacitor) — mas o trabalho atual foi no **web Admin**.
- Diretriz do produto (paciente): **reforçar presença**, não facilitar cancelamento/remarcação.
