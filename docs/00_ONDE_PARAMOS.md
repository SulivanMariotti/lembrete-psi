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
- Endpoint de login do paciente ajustado para **validar em `users`** (não depender de `subscribers`).
- Cadastro via Admin → paciente consegue acessar o painel.

### ✅ Administração de pacientes (desativação)
- Problema anterior: desativar criava “doc fantasma” (`p_base64(email)`) em `users`.
- Corrigido: desativação atualiza o **doc real** do paciente em `users/{uid}` com `status:"inactive"` + `deletedAt`.
- UI Admin passou a enviar `uid` real ao endpoint de delete.

### ⚠️ Pendente (prioridade alta)
**Erro no painel do paciente ao entrar:**
`Firestore: Uncaught Error in snapshot listener: permission-denied`

Causa provável: listeners (`onSnapshot`) no `PatientFlow.js` tentando ler coleções/docs que o paciente não tem permissão (Rules).

#### Coleções envolvidas no PatientFlow
- `users/{uid}` (perfil)
- `appointments` (agenda)
- `subscribers/{phoneCanonical}` (notificações)
- `patient_notes` (notas)

### ✅ Ação em andamento (hoje)
- Ajustar Firestore Rules para permitir leituras do paciente **somente do próprio escopo**.
- Regra mínima: corrigir `appointments` para aceitar leitura também por `email` (fallback do código) e por `phoneCanonical` (além de `phone`).

Arquivo gerado para aplicar no Firebase:
- `firestore.rules` (inclui correção do bloco `appointments`)

## Próximo passo (1 por vez)
1) Publicar `firestore.rules` no Firebase
2) Testar login como paciente e validar: erro `permission-denied` sumiu?
3) Se ainda houver erro: identificar qual coleção/path e:
   - refinar Rules, ou
   - mover leitura sensível para rota server-side (Admin SDK)

## Como testar rapidamente
- Fazer logout
- Logar como paciente
- Abrir Console (F12) e confirmar ausência de `permission-denied`
