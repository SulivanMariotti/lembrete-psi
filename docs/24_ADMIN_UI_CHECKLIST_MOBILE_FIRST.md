# 24_ADMIN_UI_CHECKLIST_MOBILE_FIRST

Checklist de UI/UX para o **Admin** com foco em usabilidade real (desktop + mobile), evitando confusões que atrapalham operação e acabam virando falha de lembrete.

> Se o Admin erra por interface confusa, o envio falha.  
> Se o envio falha, aumenta risco de falta.  
> Constância começa na operação bem-feita.

---

## 1) Layout e hierarquia

- [ ] Separar claramente os blocos em passos:
  1. Upload
  2. Verificar/validar
  3. Sincronizar
  4. Preview (dryRun)
  5. Enviar
- [ ] Cada bloco deve ter:
  - título curto
  - descrição 1 linha
  - ações principais destacadas (1 ou 2 no máximo)

---

## 2) Mobile: evitar “um abaixo do outro” excessivo

- [ ] Grupos (ex.: checklist) não devem ocupar a tela inteira no celular
- [ ] Preferir:
  - estados resumidos (“OK / Atenção / Erro”)
  - accordions (abre/fecha)
  - cards compactos

---

## 3) Botões e estados

- [ ] Botão “Enviar” só habilita quando:
  - dryRun rodou
  - existem `candidates > 0`
- [ ] Botão “Limpar” reseta TODO o state do fluxo (inclui preview)
- [ ] Botões com loading (spinner) e texto “Processando…”

---

## 4) Preview (dryRun) claro e clínico

- [ ] Mostrar contagens:
  - candidates
  - sent
  - blocked
  - blockedNoToken
  - blockedInactive
- [ ] Mostrar `blockedReason` (quando existir)
- [ ] Mostrar 1–3 amostras interpoladas (sem dados sensíveis excessivos)

---

## 5) Configurações (erros conhecidos)

- [ ] Campos de horários não podem “sumir” após refactor
- [ ] Ao salvar config, o valor no UI deve permanecer (não reverter para texto original)
- [ ] Diferenciar:
  - config persistida em `config/global`
  - state local de edição

---

## 6) Diagnóstico rápido (para suporte)

- [ ] Área “Status do sistema”:
  - projectId
  - ambiente (dev/prod)
  - última sincronização
  - versão do schema (se houver)

---

## 7) Critérios de sucesso

- Admin consegue executar o fluxo completo em <3 minutos sem dúvida.
- No mobile, nada “exploda” em altura infinita.
- Operação clara = envio confiável = mais constância terapêutica.

