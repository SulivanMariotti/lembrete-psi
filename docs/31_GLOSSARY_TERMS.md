# 31_GLOSSARY_TERMS

Glossário rápido do Lembrete Psi (termos usados no código, docs e UI).

> Objetivo: reduzir ruído de comunicação e acelerar manutenção.  
> Menos confusão técnica → menos falhas → mais constância.

---

## Termos de dados

### phoneCanonical
Telefone normalizado (só dígitos) usado como **chave técnica** para relacionar:
- `subscribers/{phoneCanonical}` (docId)
- `appointments/*` (campo)
- `attendance_logs/*` (campo)

### patientKey
Chave única do paciente no modelo NoSQL (no projeto, normalmente = `phoneCanonical`).

### denormalização
Repetir campos úteis em mais de um documento para evitar “joins” no Firestore.

---

## Termos do fluxo

### dryRun
Execução de simulação (preview) que:
- calcula candidatos
- aplica bloqueios
- retorna amostras interpoladas
Sem enviar mensagens.

### candidates
Quantidade de itens elegíveis no dryRun (antes de bloqueios).

### blocked / blockedReason
Itens impedidos de envio por regra operacional (server-side), ex.:
- `inactive` (paciente inativo)
- `noToken` (sem pushToken)
- `outsideWindow` (janela proibida, se existir)

### blockedNoToken / blockedInactive
Contadores específicos de bloqueio no dryRun/envio.

---

## Termos de coleções

### users/{uid}
Fonte de verdade do paciente (role/status).  
Campos comuns: `role`, `status`, `phoneCanonical`.

### subscribers/{phoneCanonical}
Documento por aparelho/navegador (push).  
Campo principal: `pushToken`.

### config/global
Configuração central: templates, offsets, políticas de comunicação.

### history
Coleção de logs flexível, padrão:
- `type` (string)
- `createdAt` (timestamp)
- `payload` (map)

### appointments
Agenda importada e sincronizada. Representa “planejado”, não presença.

### attendance_logs
Presença/falta por sessão (para métricas de constância e follow-ups).

---

## Termos de arquitetura

### App Router route.js
Padrão do Next.js:
- endpoints devem ser `.../route.js`
- não usar arquivos `routeXXX.js`

### server-side first
Decisões críticas não dependem do client.  
Ex.: bloquear envio para paciente inativo.

---

## Termos clínicos (produto)

### constância
Regularidade dos encontros terapêuticos.  
No produto: objetivo central.

### cuidado ativo
Automação que reduz carga mental (lembretes estratégicos).

### psicoeducação
Textos breves que explicam por que comparecer importa (sem julgamento).

### barreira saudável
Evitar “cancelar” com um clique; exige contato humano.

