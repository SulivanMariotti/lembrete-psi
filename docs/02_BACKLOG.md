# Backlog (lista viva)

> Marque com [x] quando concluir.

## Segurança / Acesso
- [x] Remover leitura direta de `subscribers` no painel do paciente (evitar permission-denied) — usar rotas server-side push
- [x] Login simples sem custo: Código de Vinculação (telefone + código) com hash+salt e single-use
- [ ] **Futuro:** reintroduzir autenticação/login seguro alternativo do paciente (magic link/OTP) + hardening geral antes de PWA/App

## Presença/Faltas (Admin)
- [x] Estabilizar preview “Amostra” (`sample`) no dryRun
- [x] Corrigir fluxo “Limpar” + reprocessar sem travar estado
- [x] Garantir visibilidade consistente de “Disparos por constância”
- [x] Processar segunda planilha/relatório de presença/faltas para painel de constância e notificações futuras

## Dados / Consistência
- [ ] Documentar modelo NoSQL Firestore (sem joins), denormalização e chave única do paciente (ex.: patientId + phone canônico)
- [ ] Deduplicar `users` por email/phoneCanonical; normalizar telefone no `users/{uid}`

## UX (Paciente)
- [ ] Identificar paciente no topo (Olá, {{nome}})
- [ ] Estado de notificações: “Ativas neste aparelho” + CTA/instruções quando inativas

## Operação / Auditoria
- [ ] Padronizar escrita do `history` (server-side): sempre gravar `type`, `createdAt`, `payload` (e `sentAt` quando fizer sentido)
