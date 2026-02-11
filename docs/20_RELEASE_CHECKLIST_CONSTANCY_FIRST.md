# 20_RELEASE_CHECKLIST_CONSTANCY_FIRST

Checklist de release com foco no objetivo do produto: **sustentar constância terapêutica**.

> Toda mudança deve ser avaliada por uma pergunta:  
> **Isso aumenta ou diminui a probabilidade do paciente comparecer?**

---

## 1) Segurança e bloqueios críticos (server-side)

- [ ] Endpoints de envio (agenda / presença-falta) bloqueiam `users/{uid}.status !== "active"`
- [ ] Bloqueio registra `history` com `blockedReason` (sem dados sensíveis)
- [ ] Nenhuma decisão crítica depende de lógica apenas no client
- [ ] Rotas seguem padrão App Router: `.../route.js`

---

## 2) Chave do paciente (consistência)

- [ ] `phoneCanonical` definido e padronizado
- [ ] `users/{uid}.phoneCanonical` preenchido
- [ ] `subscribers/{phoneCanonical}` usa docId = `phoneCanonical`
- [ ] Import da agenda e de presença/falta garante `phoneCanonical` (não “remenda” depois)

---

## 3) Fluxo do paciente (UX do compromisso)

- [ ] O paciente vê claramente:
  - [ ] Próxima sessão (data/hora)
  - [ ] Identificação (nome do paciente)
  - [ ] Estado das notificações (ativas/inativas)
- [ ] Sem botões de “cancelar sessão” / “confirmar presença” (barreira saudável)
- [ ] Mensagens reforçam: **constância é cuidado** (sem julgamento, com firmeza)

---

## 4) Import e envios (Admin)

- [ ] Import: carregar → verificar → sincronizar funciona em sequência
- [ ] “Limpar” reseta tudo e permite reprocessar sem trocar de menu
- [ ] DryRun mostra:
  - [ ] amostras interpoladas
  - [ ] `blockedReason`
  - [ ] contagens coerentes (`sent/blocked/noToken`)
- [ ] Envio real registra `history` (sent/blocked)

---

## 5) Observabilidade

- [ ] `history` recebe logs com padrão `type`, `createdAt`, `payload`
- [ ] Erros comuns documentados em `18_TROUBLESHOOTING_COMMON_ERRORS.md`
- [ ] Console não mostra erros recorrentes em uso normal

---

## 6) Testes mínimos antes de publicar

- [ ] Paciente **ativo** com token:
  - [ ] painel carrega
  - [ ] agenda aparece
  - [ ] push funciona
- [ ] Paciente **ativo** sem token:
  - [ ] painel carrega
  - [ ] dryRun mostra `blockedNoToken`
- [ ] Paciente **inativo**:
  - [ ] painel pode carregar (se permitido) mas envios são bloqueados server-side
  - [ ] logs registram bloqueio

---

## 7) Regra de ouro clínica

Se uma mudança pode “quebrar lembrete”, ela pode “quebrar constância”.  
E constância quebrada é processo interrompido.

