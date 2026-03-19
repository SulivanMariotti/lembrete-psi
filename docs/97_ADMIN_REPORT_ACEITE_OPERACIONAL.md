# 97_ADMIN_REPORT_ACEITE_OPERACIONAL

## Objetivo
Registrar os critérios formais de aceite operacional do módulo `/admin/report` para entrada controlada em homologação e posterior produção.

## Escopo coberto por este aceite
- importação de planilha `.xlsx`
- preview congelado da importação
- geração de PDF por `importSessionId`
- cadastro e manutenção de Especialidades
- cadastro e manutenção de Demandas por Especialidade
- cadastro e manutenção de Modelos de relatório
- limpeza de snapshots expirados
- auditoria mínima e proteção por rate limit nas rotas críticas

---

## Estado atual do módulo

### Arquitetura consolidada
O fluxo estabilizado é:
**Importação → Preview congelado → `importSessionId` → PDF**

### Garantias atuais
- regra clínica centralizada no backend
- preview e PDF baseados no mesmo snapshot
- isolamento de sessão por admin
- retenção temporária curta para snapshots
- rotas críticas com autenticação admin
- cobertura mínima automatizada do fluxo crítico

### Regra funcional que compõe o aceite
**Especialidade → regra da Especialidade → Demanda resolvida → CID do sistema → Categoria do sistema**

---

## Critérios de aceite

### 1. Aceite funcional
O módulo atende ao aceite funcional quando:
- a importação válida gera preview consistente
- o preview gera `importSessionId`
- o PDF é gerado a partir do snapshot, sem divergência visível
- Psicologia resolve Demanda pela planilha, com fallback em `Tags`
- Nutrição e Fonoaudiologia usam Demanda padrão da Especialidade
- `CID` e `Categoria` são derivados pelo sistema
- planilha inválida é rejeitada com erro estável

### 2. Aceite de segurança operacional
O módulo atende ao aceite de segurança quando:
- sessão expirada não gera PDF
- sessão de outro admin não gera PDF
- rotas críticas exigem autenticação admin
- importação e cleanup estão protegidos por rate limit
- existe trilha mínima de auditoria para import/PDF/cleanup

### 3. Aceite de governança de dados
O módulo atende ao aceite de governança quando:
- snapshots têm TTL definido
- cleanup manual remove expirados com retorno controlado
- retenção temporária é compatível com o fluxo operacional
- dados temporários não ficam sem política de descarte

### 4. Aceite técnico mínimo
O módulo atende ao aceite técnico quando:
- `npm run test:report-admin` passa sem falhas
- não há regressão perceptível no fluxo import → preview → PDF
- a atualização do catálogo administrativo reflete no import
- o fallback legado do catálogo está explícito e controlável por ambiente

---

## Decisão operacional sobre o fallback legado

### Opção escolhida para homologação inicial
Manter o fallback legado do catálogo **ativo por padrão**.

### Por quê
Porque é a opção de menor risco enquanto o caminho principal com `collectionGroup("demands")` é observado em ambiente real.

### Condição para desligar
O fallback só deve ser desligado depois de:
- homologação funcional concluída
- observação sem erros do catálogo em ambiente real
- confirmação de que o caminho principal atende sem regressão

### Próximo passo recomendado
Desligar primeiro em ambiente de homologação/staging, observar e só depois remover em pacote técnico pequeno.

---

## Critério de passagem para produção
O módulo pode seguir para produção controlada quando:
- [ ] a suíte `test:report-admin` estiver verde
- [ ] a checklist de homologação (`docs/96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO.md`) estiver aprovada
- [ ] logs de auditoria críticos forem conferidos
- [ ] cleanup manual funcionar como esperado
- [ ] nenhum erro crítico estiver aberto no fluxo principal
- [ ] não houver comportamento anormal do fallback legado no ambiente

---

## Responsáveis sugeridos na homologação
- Produto/Operação: valida fluxo real e aceite funcional
- Técnico/Admin: valida auditoria, cleanup e segurança de sessão
- Desenvolvimento: corrige qualquer desvio antes da produção

---

## Resultado formal da rodada de aceite
Preencher ao final:
- Data:
- Ambiente:
- Responsável técnico:
- Responsável funcional:
- Resultado: Aprovado / Aprovado com ressalvas / Reprovado
- Ressalvas:
- Plano de correção:
- Data alvo para produção:
