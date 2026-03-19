# 91 — REPORT IMPORT — PACOTE 3 / LOTE A

## Objetivo
Executar o primeiro lote técnico do Pacote 3 do módulo `/admin/report` com foco em:
- centralizar a regra oficial da importação
- blindar a rota de importação
- preparar melhor a governança do snapshot temporário
- manter preview e PDF com o mesmo comportamento funcional

---

## Escopo fechado do Lote A

### Incluído
- criação de um motor de regra dedicado para o import
- refatoração controlada do `reportImportAnalysis.js` para papel de orquestração
- reforço de segurança e observabilidade em `/api/admin/report/import`
- ajustes finos em `reportImportSessions.js`
- alinhamento leve de `/api/admin/report/pdf`

### Fora deste lote
- refatoração estrutural do `src/components/Admin/AdminReportImportView.js`
- otimização N+1 na leitura de Especialidades/Demandas
- rotina automática de limpeza de snapshots expirados
- revisão ampla de UX do painel

---

## Regra oficial congelada

### Regra-mãe
**Especialidade -> regra da Especialidade -> Demanda resolvida -> CID do sistema -> Categoria do sistema**

### Especialidade por modo
- **Psicologia** = `EXCEL`
- **Nutrição** = `SYSTEM_DEFAULT`
- **Fonoaudiologia** = `SYSTEM_DEFAULT`

### Regras consolidadas
- em `EXCEL`, a precedência é:
  1. `Demanda`
  2. fallback em `Tags`
- em `SYSTEM_DEFAULT`, a planilha não define a Demanda oficial
- `CID` e `Categoria` não são fonte oficial da planilha
- o PDF usa apenas o snapshot congelado pelo preview

---

## Cenários-base de regressão

1. **Psicologia com Demanda válida**
   - esperado: linha `ready`

2. **Psicologia sem Demanda, com fallback em Tags**
   - esperado: linha resolvida via `Tags` quando existir correspondência

3. **Psicologia sem Demanda e sem Tags**
   - esperado: `psychology-missing-demand`

4. **Nutrição**
   - esperado: usar Demanda padrão da Especialidade

5. **Fonoaudiologia**
   - esperado: usar Demanda padrão da Especialidade

6. **Especialidade inexistente**
   - esperado: `specialty-not-found`

7. **Especialidade inativa**
   - esperado: `inactive-specialty`

8. **Demanda inativa**
   - esperado: `inactive-demand`

9. **Categoria vazia na Demanda resolvida**
   - esperado: `missing-category`

10. **Sessão válida**
    - esperado: preview e PDF usam o mesmo snapshot

11. **Sessão expirada**
    - esperado: bloqueio com erro de expiração

12. **Sessão de outro admin**
    - esperado: bloqueio por posse

13. **Template inválido**
    - esperado: erro `invalid-template-headers`

14. **Abuso da rota de importação**
    - esperado: rate limit

---

## Arquivos alterados no Lote A

- `docs/91_REPORT_IMPORT_PACKAGE3_LOTE_A.md`
- `src/lib/server/reportImportRuleEngine.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/app/api/admin/report/import/route.js`
- `src/lib/server/reportImportSessions.js`
- `src/app/api/admin/report/pdf/route.js`

---

## Decisões do lote

### Regra oficial
**Opção escolhida:** criar `reportImportRuleEngine.js` como ponto de verdade da regra de resolução.

**Por quê:** separar parsing/IO da regra clínica reduz acoplamento e facilita manutenção.

**Impacto:** `reportImportAnalysis.js` passa a orquestrar o fluxo, sem carregar sozinho toda a regra do domínio.

**Como validar:** a mesma planilha deve gerar o mesmo `matchSummary`, as mesmas `previewRows` e os mesmos `readyRows`.

---

### Segurança da importação
**Opção escolhida:** subir `/api/admin/report/import` para o mesmo nível mínimo de robustez operacional da rota de PDF.

**Por quê:** importação é uma borda crítica e mais suscetível a abuso/custo.

**Impacto:** entra `rateLimit`, `audit log` e tratamento padronizado de erro inesperado.

**Como validar:** importações válidas continuam funcionando; abuso em sequência deve ser bloqueado.

---

### Governança do snapshot
**Opção escolhida:** manter a API pública da sessão e adicionar metadados internos de snapshot.

**Por quê:** prepara auditoria, rastreabilidade e futuras rotinas de limpeza sem quebrar o frontend.

**Impacto:** entram `snapshotVersion`, `snapshotSource` e `snapshotSummary`.

**Como validar:** o cliente continua recebendo o mesmo contrato essencial de sessão.

---

## Riscos monitorados

- regressão silenciosa em `categoryStatus`
- divergência entre preview e PDF
- mudança acidental no contrato da rota de import
- drift no payload salvo em `report_import_sessions`

---

## Critério de saída do Lote A
O lote é considerado correto quando:
- preview continua compatível com o comportamento atual
- PDF continua baseado apenas no snapshot
- a regra fica mais centralizada
- a importação passa a ter rate limit e auditoria
- a sessão continua respeitando posse por admin e expiração
