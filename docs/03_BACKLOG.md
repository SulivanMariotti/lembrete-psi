# Backlog (lista viva)

> Marque com [x] quando concluir.

## Segurança / Acesso
- [x] Corrigir `permission-denied` no painel do paciente (Rules e/ou mover leituras para server-side)
- [x] Bloquear envios server-side para pacientes inativos (agenda + presença/falta) → retornar `blockedInactive`

## Dados / Consistência
- [x] Processar segunda planilha de presença/faltas para painel de constância e disparos futuros
- [ ] Definir modelo NoSQL Firestore (sem joins), denormalização e chave única (ex.: patientId + phone canônico)

## UX (Paciente)
- [x] Identificar paciente no topo do painel (Olá, {nome})
- [x] Estado de notificações: “Ativas neste aparelho” / instrução quando inativas

## Admin
- [ ] Melhorar fluxo de seleção/“acessar como” paciente (se necessário)
- [ ] Dedup/merge por patientExternalId + registrar `mergedTo` e histórico

## Operação
- [ ] Rotinas de limpeza e validação (ex.: detectar docs órfãos/legados)
