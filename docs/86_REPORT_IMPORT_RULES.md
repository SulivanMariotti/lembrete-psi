# 86 — Regras oficiais da importação por Especialidade no módulo de relatórios

## Objetivo
A importação do `/admin/report` é guiada pela **Especialidade**. A Especialidade define como a **Demanda** será resolvida, e o sistema usa a Demanda resolvida para preencher **CID** e **Categoria**.

## Regra-mãe
`Especialidade -> regra da Especialidade -> Demanda resolvida -> CID do sistema -> Categoria do sistema`

## Regras por modo de origem da Demanda

### `excel`
- Usa a coluna `Demanda`.
- Se `Demanda` vier vazia, faz fallback em `Tags`.
- A Demanda informada é validada dentro da Especialidade encontrada no sistema.

### `system_default`
- Ignora `Demanda` e `Tags` do arquivo para escolher a Demanda.
- Usa `defaultDemandId` da Especialidade.
- A Demanda padrão precisa existir e estar ativa para a linha ficar pronta.

## Regra padrão por Especialidade
- **Psicologia** -> `excel`
- **Nutrição** -> `excel`
- **Fonoaudiologia** -> `excel`

## Origem oficial dos campos

### Demanda
- Para as especialidades oficiais do módulo, vem do arquivo conforme o modo `excel`.
- A precedência é:
  1. `Demanda`
  2. `Tags`

### CID
- Sempre vem da **Demanda resolvida no sistema**.
- O valor final é escolhido conforme a regra de idade aplicada em `resolveDemandCidByBirthDate()`.

### Categoria
- Sempre vem da **Demanda resolvida no sistema**.
- O conteúdo aplicado depende da categoria do lote selecionada pelo admin.

## Contrato do arquivo XLSX
- `Tags` continua como coluna obrigatória do template oficial.
- `Demanda` continua opcional por compatibilidade.
- Para Especialidades em modo `excel`, a precedência é:
  1. `Demanda`
  2. `Tags`

## Status operacionais
- `ready`
- `missing-specialty`
- `specialty-not-found`
- `inactive-specialty`
- `excel-missing-demand`
- `excel-demand-not-found`
- `specialty-without-default-demand`
- `inactive-demand`
- `missing-category`

## Regras que não podem ficar ambíguas
- `Tags` não é a regra única do sistema.
- `Demanda` continua opcional na planilha por compatibilidade, mas é a fonte prioritária quando informada.
- `CID` não é lido da planilha como fonte oficial.
- `Categoria` não é lida da planilha como fonte oficial.
- Nutrição e Fonoaudiologia seguem a mesma regra oficial da Psicologia no módulo atual.

## Critérios de aceitação
1. Psicologia com `Demanda` válida fica pronta e usa CID/Categoria do sistema.
2. Psicologia sem `Demanda`, mas com `Tags` válida, fica pronta e usa CID/Categoria do sistema.
3. Nutrição com `Demanda` válida fica pronta e usa CID/Categoria do sistema.
4. Nutrição sem `Demanda`, mas com `Tags` válida, fica pronta e usa CID/Categoria do sistema.
5. Fonoaudiologia com `Demanda` válida fica pronta e usa CID/Categoria do sistema.
6. Fonoaudiologia sem `Demanda`, mas com `Tags` válida, fica pronta e usa CID/Categoria do sistema.
7. Especialidade inexistente fica inconsistente com `specialty-not-found`.
8. Linha sem `Demanda` e sem `Tags` em especialidade `excel` fica inconsistente com `excel-missing-demand`.
9. Linha com `Demanda`/`Tags` sem correspondência ativa no catálogo fica inconsistente com `excel-demand-not-found`.
