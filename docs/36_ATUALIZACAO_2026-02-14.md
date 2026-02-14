# Atualização — 2026-02-14 (UX Paciente + Diário + Dashboard Admin + Marca Permittá)

Este documento resume **todas as alterações implementadas neste chat**, organizadas por passos, com foco em:

- **Paciente:** reduzir poluição visual, melhorar legibilidade mobile e reforçar vínculo/constância.
- **Diário Rápido:** transformar em ferramenta clínica de preparação para a sessão.
- **Admin:** trazer **Constância Terapêutica** para o centro do Dashboard.
- **Branding:** padronizar cores Permittá em Paciente + Admin via *skins CSS* (sem mexer em alertas).

---

## ✅ Passos concluídos (1–20)

### 1) Header do Paciente
- Removido “Olá, …” (redundante) e mantido só o nome.
- Ajuste visual do telefone.
- Melhor contraste dos itens de menu “Admin” e “Sair”.

### 2) Card “Seu próximo atendimento” (mobile)
- Melhor leitura de data/profissional/local no celular.
- Destaque sutil do bloco para orientar foco do paciente.

### 3) Contrato
- Quando contrato está **OK**, o card de contrato **não aparece** no painel.
- Contrato segue disponível para leitura futura pelo menu “Contrato”.

### 4) Agenda do Paciente
- Corrigidos truncamentos no mobile.
- Removido “Upload: upload_…”.
- Mantido apenas “Agenda atualizada em {data e hora}”.

### 5) Diretriz de UX (Paciente)
- Reforçada diretriz: **sem** mensagens do tipo “avise com antecedência” no painel do paciente.
- **Sem** atalhos de contato (ex.: WhatsApp) na Agenda que facilitem cancelamento/remarcação.
- Se existir WhatsApp, apenas para **reforço de compromisso/confirmar presença**, nunca como CTA de cancelamento/remarcação.

### 6) Diário Rápido — layout e usabilidade
- Melhor hierarquia e copy psicoeducativo.
- Textarea melhor no mobile (mais confortável).
- Chips de reflexão (prompts) para facilitar escrita.
- Feedback discreto de salvamento (“Salvo agora • HH:MM”).

### 7) Diretrizes — biblioteca de frases
- Criada biblioteca com 50 frases base: `docs/35_BIBLIOTECA_DE_FRASES_BASE.md`.

### 8) Diário Rápido — preview e histórico
- Card mostra apenas **2 últimas anotações** (continuidade sem poluir).
- Modal “Histórico” com busca e lista completa.

### 9) Diário Rápido — vínculo com próxima sessão
- Exibe contexto: “Para sua próxima sessão: DD/MM/AAAA HH:MM”.

### 10) Diário Rápido — destaque
- Permite **destacar** uma anotação para ficar em evidência até a próxima sessão.
- Persistência local por paciente (localStorage).

### 11) Admin Dashboard — Constância no centro
- Dashboard mostra “Constância Terapêutica (30 dias)” no topo:
  - Presenças / Faltas / Taxa
  - Top faltas
  - “Ver detalhes” → Presença/Faltas

### 12) Admin Dashboard — ações rápidas + alerta de risco
- “Ações rápidas”: ir para Presença/Faltas, Importação e Follow-ups.
- Alerta discreto: pacientes com **2+ faltas**.
- Âncoras/scroll inteligente na aba Presença/Faltas.

### 13) Admin — nomes + copiar telefone + período persistido
- Top faltas/alertas exibem **Nome + telefone**.
- Botão de copiar telefone.
- Período (7/30/90) fica persistido.

### 14) Login — logo Permittá
- Ícone do login substituído pelo logo (versão atual com fundo transparente).
- Assets em `public/brand`.

### 15–20) Branding Permittá (skins + refinamentos)
- Aplicado padrão Permittá por escopo:
  - `.skin-patient` (Paciente + Login)
  - `.skin-admin` (Admin)
- Refinos:
  - fundos/bordas/sombras harmonizados
  - brancos tintados
  - contraste de textos/ícones
  - estados (hover/focus/ring/disabled)
- **Alertas preservados** (red/amber/green).

---

## 🔜 Próximo passo (21)

### 21) Auditoria de “resíduos de cor” (opcional, recomendado)
Objetivo: garantir 100% que não restou nada fora do padrão Permittá.

1. Varredura em `src/` por classes/valores fora do padrão (ex.: `text-blue-*`, `bg-indigo-*`, `from-purple-*`, SVG com fill fixo, estilos inline).
2. Ajustar pontualmente para `brand-*` ou neutros.
3. Confirmar que alertas continuam intactos.

Detalhe do passo: `docs/40_PASSO_21_AUDITORIA_CORES.md`.
