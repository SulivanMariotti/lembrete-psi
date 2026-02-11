# Backlog (lista viva)

> Marque com [x] quando concluir.

## Segurança / Acesso
- [x] Corrigir `permission-denied` no painel do paciente (push/status via rotas server-side; sem leitura direta de `subscribers` no client)
- [x] Bloquear envios server-side para pacientes inativos (agenda + presença/falta) → retornar `blockedInactive...`
- [ ] **Futuro:** reintroduzir autenticação/login seguro do paciente (magic link/OTP) e reforçar segurança antes de PWA/App (Capacitor)

## Dados / Consistência
- [ ] Processar segunda planilha de presença/faltas para painel de constância e disparos futuros
- [ ] Definir modelo NoSQL Firestore (sem joins), denormalização e chave única (ex.: patientId + phone canônico)
- [ ] Deduplicar `users` (email/phoneCanonical) e padronizar telefone no `users/{uid}` (evitar doc sem telefone)

## UX (Paciente)
- [ ] Identificar paciente no topo do painel (Olá, {{nome}})
- [ ] Estado de notificações: “Ativas neste aparelho” / instrução quando inativas (mensagem clara + CTA)

## Admin
- [x] Melhorar lista de pacientes (flags para Cadastro/Contrato/Notificações)
- [ ] Melhorar fluxo “acessar como paciente” (se necessário)
- [ ] Dedup/merge por `patientExternalId` + registrar `mergedTo` e histórico

## Operação
- [ ] Rotinas de limpeza/validação (detectar docs órfãos/legados)
- [ ] Padronizar escrita do `history` (server-side) para sempre gravar `createdAt` (e opcional `sentAt` quando fizer sentido)
