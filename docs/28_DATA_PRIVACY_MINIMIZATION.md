# 28_DATA_PRIVACY_MINIMIZATION

Este documento define práticas de **minimização de dados** e privacidade no Lembrete Psi.

> Princípio clínico e ético: coletar o mínimo necessário.  
> A meta do sistema é sustentar constância — não acumular dados pessoais.

---

## 1) O que é “mínimo necessário” aqui

Para cumprir lembretes e vínculo, normalmente basta:
- `phoneCanonical` (chave técnica)
- nome (para personalização básica: `{nome}`)
- horários (data/hora/profissional/local/serviço)
- `pushToken` (para web push)

Evitar armazenar:
- conteúdo clínico sensível em logs
- motivos de ausência detalhados
- qualquer dado que não tenha função direta no fluxo

---

## 2) Onde pode existir dado sensível (e como evitar)

### 2.1 `history`
**Risco:** logs virarem “banco de dados paralelo” com dados pessoais.  
**Regra:** payload deve conter apenas:
- IDs técnicos
- contagens e status
- `blockedReason` genérico (ex.: `inactive`, `noToken`)
- mensagens interpoladas: evitar incluir texto completo se contiver dados pessoais

Recomendação:
- logar apenas um “preview truncado” (ex.: primeiras 80–120 chars) ou um hash.

### 2.2 `patient_notes` (se existir)
Se houver anotações:
- acesso estritamente controlado
- preferir armazenamento separado e com regras específicas
- logs de acesso (sem conteúdo)

---

## 3) Mascaramento no UI

- Telefone: mostrar apenas últimos 3–4 dígitos quando não for necessário o número inteiro
- Nome: ok exibir, mas evitar lista pública/aberta sem autenticação admin

---

## 4) Retenção de dados (recomendação)

- `appointments`: manter histórico mínimo necessário para auditoria (ex.: 6–12 meses) conforme operação
- `attendance_logs`: manter para métricas (definir janela)
- `history`: rotacionar/limpar logs antigos (ex.: 90–180 dias), mantendo apenas agregados relevantes

> Importante: se for remover dados, registre `history` com `type: data.retention.cleanup` sem detalhes sensíveis.

---

## 5) Exportação e backup

- Backups devem ser protegidos (acesso restrito)
- Ao exportar para análise:
  - remover nome/telefone
  - usar `phoneCanonical` hash ou id aleatório

---

## 6) Checklist antes de logar algo novo

- [ ] Isso é necessário para operar ou depurar?
- [ ] Eu poderia logar apenas um id/contagem?
- [ ] Se este log vazasse, causaria dano ao paciente?
- [ ] Existe alternativa server-side sem expor ao client?

---

## 7) Vínculo sem invasão

O produto sustenta constância com:
- mensagens educativas e acolhedoras
- lembretes confiáveis
- barreiras saudáveis para cancelamento

Não com monitoramento excessivo.

