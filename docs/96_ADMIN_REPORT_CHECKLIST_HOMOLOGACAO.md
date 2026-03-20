# 96_ADMIN_REPORT_CHECKLIST_HOMOLOGACAO

## Objetivo
Executar a homologação funcional e operacional do módulo `/admin/report` com um checklist curto, objetivo e repetível, sem abrir novas frentes de refatoração.

## Pré-requisitos
- ambiente com Auth/Firestore/Storage configurados
- usuário autenticado com perfil de admin
- pelo menos 1 Modelo de relatório ativo
- Especialidades e Demandas cadastradas para:
  - Psicologia
  - Nutrição
  - Fonoaudiologia
- planilhas de teste preparadas para os cenários abaixo
- suíte `npm run test:report-admin` executada com sucesso antes da rodada manual

## Regra oficial que deve permanecer estável
Fluxo oficial:
**Especialidade → regra da Especialidade → Demanda resolvida → CID do sistema → Categoria do sistema**

### Psicologia, Nutrição e Fonoaudiologia
- origem oficial da Demanda: coluna `Demanda`
- fallback: `Tags`
- modo da Especialidade: `EXCEL`

### CID e Categoria
- derivados pelo sistema
- não aceitos da planilha como regra final

---

## Checklist de homologação

### Bloco A — Validação técnica mínima antes do uso manual
- [ ] Rodar `npm run test:report-admin`
- [ ] Confirmar suíte sem falhas
- [ ] Confirmar que o ambiente está apontando para o projeto Firebase correto
- [ ] Confirmar que existe ao menos 1 template ativo e acessível ao admin

### Bloco B — Importação e preview

#### Cenário B1 — Psicologia com Demanda preenchida
- [ ] Acessar `/admin/report`
- [ ] Selecionar categoria
- [ ] Selecionar modelo/template
- [ ] Importar planilha `.xlsx` válida
- [ ] Confirmar geração de preview
- [ ] Confirmar `matchSummary` coerente
- [ ] Confirmar linhas prontas (`ready`) no preview

**Esperado**
- Demanda resolvida pela coluna `Demanda`
- Preview sem divergência visível
- `importSessionId` retornado

#### Cenário B2 — Psicologia sem Demanda, usando fallback em `Tags`
- [ ] Importar planilha sem `Demanda` preenchida
- [ ] Confirmar resolução via `Tags`

**Esperado**
- linha resolvida quando `Tags` permitir fallback
- status consistente no preview

#### Cenário B3 — Nutrição com Demanda preenchida
- [ ] Importar planilha válida de Nutrição com `Demanda`

**Esperado**
- linha pronta
- Demanda resolvida pela coluna `Demanda`

#### Cenário B4 — Nutrição sem Demanda, usando fallback em `Tags`
- [ ] Importar planilha de Nutrição sem `Demanda` e com `Tags` válida

**Esperado**
- linha pronta
- resolução via `Tags`

#### Cenário B5 — Fonoaudiologia com Demanda preenchida
- [ ] Importar planilha válida de Fonoaudiologia com `Demanda`

**Esperado**
- linha pronta
- Demanda resolvida pela coluna `Demanda`

#### Cenário B6 — Fonoaudiologia sem Demanda, usando fallback em `Tags`
- [ ] Importar planilha de Fonoaudiologia sem `Demanda` e com `Tags` válida

**Esperado**
- linha pronta
- resolução via `Tags`

#### Cenário B7 — Especialidade em `excel` sem Demanda e sem `Tags`
- [ ] Importar planilha sem `Demanda` e sem `Tags`

**Esperado**
- linha não pronta
- status `excel-missing-demand`
- preview explicando o bloqueio

#### Cenário B8 — Especialidade em `excel` com Demanda não encontrada
- [ ] Importar planilha com `Demanda` inexistente no catálogo da especialidade

**Esperado**
- linha não pronta
- status `excel-demand-not-found`

#### Cenário B9 — Template inválido
- [ ] Importar planilha com cabeçalho/template inválido

**Esperado**
- bloqueio com erro estável
- resposta compatível com `invalid-template-headers`
- nenhum snapshot útil deve ser criado

### Bloco C — Geração de PDF

#### Cenário C1 — Sessão válida
- [ ] Gerar PDF a partir de preview recém-criado

**Esperado**
- PDF gerado com sucesso
- conteúdo coerente com o preview
- nenhum recálculo perceptível na borda

#### Cenário C2 — Sessão expirada
- [ ] Tentar gerar PDF com sessão fora do TTL

**Esperado**
- bloqueio por expiração
- sem vazamento de conteúdo

#### Cenário C3 — Sessão de outro admin
- [ ] Tentar gerar PDF usando sessão criada por outro admin

**Esperado**
- bloqueio por posse da sessão
- sem acesso indevido ao snapshot

### Bloco D — Especialidades e Demandas
- [ ] Criar nova Especialidade
- [ ] Editar Especialidade existente
- [ ] Criar Demanda vinculada à Especialidade
- [ ] Editar Demanda vinculada
- [ ] Inativar Demanda
- [ ] Excluir Demanda, quando permitido
- [ ] Em Especialidade `SYSTEM_DEFAULT`, definir Demanda padrão apenas quando esse modo for usado de forma excepcional

**Esperado**
- alterações refletidas no fluxo de importação
- cache do catálogo invalidado após mudanças administrativas

### Bloco E — Modelos
- [ ] Criar Modelo
- [ ] Editar cabeçalho, corpo e rodapé
- [ ] Inserir TAGS suportadas
- [ ] Subir logo
- [ ] Remover logo
- [ ] Conferir preview renderizado do Modelo

**Esperado**
- preview visual consistente
- geração de PDF respeitando o modelo salvo

### Bloco F — Operação e governança

#### Cleanup manual
- [ ] Executar `POST /api/admin/report/import/cleanup` como admin

**Esperado**
- retorno `{ ok: true, deleted, scanned }`
- sem erro de permissão para admin válido

#### Auditoria
- [ ] Conferir eventos de importação
- [ ] Conferir eventos de geração de PDF
- [ ] Conferir eventos de cleanup

**Esperado**
- trilha mínima presente
- metadados suficientes para suporte

#### Rate limit
- [ ] Repetir chamadas de importação acima do limite
- [ ] Repetir cleanup acima do limite, se necessário

**Esperado**
- bloqueio controlado
