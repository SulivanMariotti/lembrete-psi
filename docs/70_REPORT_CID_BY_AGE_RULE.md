# 70_REPORT_CID_BY_AGE_RULE.md

## Objetivo
Adicionar suporte a **CID automático por idade** no módulo `/admin/report`.

## O que mudou
- Cadastro de **Demanda** agora possui:
  - `cidInf`
  - `cidAdult`
- Nova TAG disponível no modelo de relatório:
  - `{{cid}}`
- TAGs auxiliares:
  - `{{cid_inf}}`
  - `{{cid_adult}}`

## Regra de negócio
- Se `data_nascimento` indicar paciente com **menos de 18 anos**:
  - `{{cid}}` usa `cidInf`
- Se `data_nascimento` indicar paciente com **18 anos ou mais**:
  - `{{cid}}` usa `cidAdult`
- Se `data_nascimento` estiver **vazia** ou **inválida**:
  - `{{cid}}` usa `cidAdult` por padrão

## Pontos técnicos
- A idade é calculada a partir do campo `Data de Nascimento` da planilha.
- O cálculo é aplicado:
  - no preview/importação
  - na renderização das TAGS
  - no PDF final

## Arquivos impactados
- `src/lib/shared/reportDemands.js`
- `src/app/api/admin/report/demands/route.js`
- `src/app/api/admin/report/demands/[id]/route.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/lib/shared/reportTemplates.js`
- `src/components/Admin/AdminReportImportView.js`

## Checklist de validação
1. Cadastre uma Demanda com `CID Inf` e `CID Adult`.
2. Use `{{cid}}` no modelo do relatório.
3. Importe uma linha com paciente menor de 18 anos.
4. Gere o PDF e confirme uso do `CID Inf`.
5. Importe uma linha com paciente maior de 18 anos.
6. Gere o PDF e confirme uso do `CID Adult`.
7. Teste uma linha sem `Data de Nascimento`.
8. Confirme que `{{cid}}` cai para `CID Adult`.
