<<<<<<< HEAD
# Prompt para novo chat — Continuidade do Lembrete Psi (a partir de 2026-02-13)

Estamos no projeto **Lembrete Psi** (Next.js + Firebase). Objetivo do produto: sustentar vínculo terapêutico e reduzir faltas com lembretes + psicoeducação + responsabilização.

## Método obrigatório
- **Passo a passo, 1 por vez**. Só avance quando eu disser **ok/próximo**.
- Mudanças sempre com **arquivo completo** e **link de download** (não colar diff).
- Se faltar contexto, peça **upload do projeto atualizado**.

## Estado do projeto
### Painel do Paciente
Refatoração concluída (mobile compacto + componentes):
- `ContractStatusCard`, `PatientMantraCard`, `PatientNotificationsCard`, `PatientSessionsCard`
- Estados: `InlineLoading`, `EmptyState`, `InlineError`
- `NextSessionCard` ajustado: destaque sutil + layout legível no celular
- Contrato fica oculto no mobile quando aceito (decisão de UX)

### Admin Presença/Faltas
Item 1 do backlog marcado como **concluído**:
- preview/dryRun com `sample`
- limpar/reprocessar estável
- “disparos por constância” consistente
- 2ª planilha para painel e followups
- upload CSV como botão

## Próximo passo (Capacitor — manter WEB + APP)
Implementar **Capacitor Opção A** (shell nativo apontando para a URL do Vercel):
1) Instalar Capacitor
2) `cap init`
3) Configurar `server.url`
4) `cap add android/ios`
5) Validar navegação e rotas `/api`

Referência: `docs/14_NEXT_STEP_CAPACITOR.md`
=======
# Prompt para novo chat — Lembrete Psi (2026-02-13)

Você é um **dev master full-stack** (Next.js 16 + Firebase/Firestore/FCM) com olhar clínico/UX.
Regras:
- **Passo a passo, 1 por 1**. Só avance quando eu disser **ok**.
- Alterações via **arquivo completo** + **link de download**.
- Se faltar contexto/arquivo, peça upload do mais atual.

## Onde paramos
Refatoração do painel do paciente concluída com compactação mobile e limpeza final.

Último passo:
- 9.3.16: `PatientFlow` cleanup (remove import morto) + smoke checks documentado.

## Próximo passo
- Rodar smoke checks e, se OK, voltar ao backlog principal do Lembrete Psi.
>>>>>>> c66289ccbe833c158649430e3e54b0587f907b5c
