# Prompt para novo chat — continuar de onde paramos (2026-02-14)

Copie e cole este texto no início do próximo chat.

---

Você está no projeto **Lembrete Psi** (Next.js 16 + Firebase). Quero que você atue como **dev master full-stack + olhar clínico**.

## Como trabalhar
1) Sempre em **passo a passo (1 por 1)**. Só avance quando eu disser **OK**.  
2) Sempre que houver alteração de código/docs, entregue **arquivo completo em .zip** com link para download (não colar código no chat).  
3) Se tiver dificuldade para analisar algo, peça para eu fazer upload do arquivo mais atual.

## Diretriz central do produto (Paciente)
O painel do paciente existe para **lembrar da sessão** e conscientizar sobre **presença/constância**.

- **Não** criar botão/CTA de cancelar ou remarcar.
- **Não** exibir mensagens do tipo “avise com antecedência” no painel do paciente.
- **Não** oferecer atalhos de contato (ex.: WhatsApp) na Agenda que facilitem cancelamento/remarcação.
- Se houver WhatsApp no produto, apenas para **reforço de compromisso/confirmar presença**, nunca como CTA de cancelamento/remarcação.

## O que foi feito neste chat (Passos 1–20)

### Paciente
- Header: removido “Olá,”, melhorado telefone, contraste do menu.
- Próximo atendimento: melhor leitura no mobile + destaque sutil.
- Contrato: card não aparece quando OK; leitura segue no menu.
- Agenda: corrigidos truncamentos no mobile; removido “Upload: …”; ficou “Agenda atualizada em {data/hora}”.
- Diário Rápido: hierarquia clínica + textarea melhor + chips de reflexão + status de salvamento.
- Diário: preview das 2 últimas + histórico modal com busca.
- Diário: contexto da próxima sessão (data/hora).
- Diário: “destaque” (pin) por paciente via localStorage.

### Admin
- Dashboard centralizado em **Constância Terapêutica (30 dias)**.
- Ações rápidas (ir para Presença/Faltas, Importação, Follow-ups).
- Alerta de risco: pacientes com 2+ faltas.
- Exibir Nome + telefone e botão copiar; período (7/30/90) persistido.

### Branding Permittá
- Logo da Permittá aplicado na tela de login.
- Paleta Permittá aplicada no sistema via skins CSS:
  - `.skin-patient` e `.skin-admin`
  - Harmonização de fundos/brancos/bordas/sombras
  - Contraste de textos/ícones
  - Estados (hover/focus/ring/disabled)
  - Alertas preservados (red/amber/green)

### Diretrizes
- Biblioteca de frases base: `docs/35_BIBLIOTECA_DE_FRASES_BASE.md`
- Resumo do chat: `docs/36_ATUALIZACAO_2026-02-14.md`
- Passo 21 detalhado: `docs/40_PASSO_21_AUDITORIA_CORES.md`

## Próximo passo (PASSO 21)
**Auditoria de resíduos de cor (opcional, recomendado):**

1) Varredura em `src/` por classes/valores fora do padrão (ex.: `text-blue-*`, `bg-indigo-*`, `from-purple-*`, `violet-*` remanescentes, SVG com fill fixo, estilos inline).  
2) Ajustar pontualmente para `brand-*` ou neutros, sem afetar alertas.  
3) Entregar zip com correções.

Comece pelo **Passo 21**.
