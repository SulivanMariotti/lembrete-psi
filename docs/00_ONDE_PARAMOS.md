# Lembrete Psi — Onde paramos

Data: 2026-02-13

## Missão (produto)
Sustentar o vínculo terapêutico e reduzir faltas pela **constância**:
- lembretes automáticos (48h, 24h, manhã)
- psicoeducação no painel do paciente
- responsabilização (contrato, constância, histórico/auditoria)
- UX deliberada (sem “cancelar sessão” fácil; sessão como contrato)

---

## Estado atual (confirmado)

### ✅ Contrato Terapêutico
- Admin define em `config/global`:
  - `contractText` (string)
  - `contractVersion` (number)
- Paciente lê e aceita; grava em `users/{uid}`:
  - `contractAcceptedVersion` (number)
  - `contractAcceptedAt` (timestamp)
- Painel do paciente agora usa componente dedicado:
  - `src/features/patient/components/ContractStatusCard.js`
  - `PatientFlow.js` renderiza o componente e removeu o bloco antigo (sem duplicidade)

### ✅ Push / Notificações (sem permission-denied)
- Painel do paciente **não lê** `subscribers/{phoneCanonical}` direto do Firestore.
- O paciente usa apenas rotas server-side:
  - `GET /api/patient/push/status`
  - `POST /api/patient/push/register`
- Recuperação de telefone quando ausente:
  - `GET /api/patient/resolve-phone` (resolve por email e persiste no `users/{uid}` quando possível)

### ✅ Histórico (Admin)
- Leitura robusta com fallback entre `createdAt` e `sentAt` (legado):
  - `sentAt ← sentAt || createdAt || payload.sentAt || payload.createdAt`
  - `createdAt ← createdAt || sentAt || payload.createdAt || payload.sentAt`
- Tipos exibidos com **rótulos amigáveis** (PT-BR) e `type` técnico no hover.

### ✅ Importação Presença/Faltas (CSV) + auditoria
- Admin → Presença/Faltas:
  - Verificar (dryRun) com erros/avisos, amostra e contadores
  - Botões de download:
    - **Baixar inconsistências (CSV)**
    - **Baixar preview normalizado (CSV)**

---

## Pendências (prioridade alta)
1) **Painel de Constância (Paciente)** alimentado por `attendance_logs`:
   - reforço de presença (“parabéns pela consistência”)
   - psicoeducação em caso de falta (sem moralismo; foco em vínculo/continuidade)
2) Ferramenta de “higiene de cadastro”:
   - consolidar `patientExternalId`, `phoneCanonical` e evitar duplicidades em `users`.

## Próximo passo sugerido (1 por vez)
**Step 9.3.10:** ajustar identificação do paciente no topo do Painel do Paciente (nome/saudação) e remover duplicidades (desktop e mobile).
