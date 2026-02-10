# Lembrete Psi — Onde paramos

Data: 2026-02-10

## Objetivo do projeto
Reduzir faltas e sustentar o vínculo terapêutico com:
- lembretes automáticos (48h, 24h, manhã)
- psicoeducação no painel do paciente
- responsabilização (constância, histórico, transparência)
- UX deliberada (sem “cancelar sessão” fácil; sessão como contrato)

## Estado atual (confirmado)
### ✅ Acesso do paciente
- Endpoint de login do paciente ajustado para validar em `users` (não depender de `subscribers`).
- Cadastro via Admin → paciente consegue acessar o painel.

### ✅ Administração de pacientes (desativação)
- Problema anterior: desativar criava “doc fantasma” (`p_base64(email)`) em `users`.
- Corrigido: desativação atualiza o doc real do paciente em `users/{uid}` com `status:"inactive"` + `deletedAt`.
- UI Admin passou a enviar `uid` real ao endpoint de delete.

### ✅ Firestore Rules (painel do paciente)
- Resolvido o erro: `Firestore: Uncaught Error in snapshot listener: permission-denied`.
- Causa: listener do PatientFlow em `subscribers/{phoneCanonical}` quando o doc ainda não existia (regras antigas dependiam de `resource.data.email`).
- Solução: Rules permitem paciente ler/criar/atualizar apenas o próprio `subscribers/{phoneCanonical}`.

## Pendente (prioridade alta)
- Bloquear envios server-side para pacientes inativos:
  - lembretes de agenda
  - disparos de presença/falta (constância)
  - qualquer envio futuro acionado pelo Admin

## Próximo passo (1 por vez)
**Próximo passo (1/1):** adicionar bloqueio server-side em todos os endpoints de envio (`/api/admin/.../send`) para checar o paciente em `users` e, se não estiver `active` (ou tiver `deletedAt`/flags de inativo), retornar `blockedInactive` e não enviar.

## Como testar rapidamente
- Publicar regras no Firebase Console quando houver alteração em `/firestore.rules`
- Logout → login como paciente → abrir painel → console sem `permission-denied`
- Para o próximo passo: disparar envio e confirmar `blockedInactive` para pacientes desativados
