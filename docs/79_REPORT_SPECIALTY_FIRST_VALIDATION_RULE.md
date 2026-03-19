# Regra de validação do botão Gerar PDF por Especialidade

## Objetivo
Trocar a trava operacional do lote para que a validação principal aconteça pela coluna **Especialidade**.

## Regra aplicada
1. O botão **Gerar PDF** continua liberando quando existir pelo menos 1 linha `ready`.
2. O cálculo de `ready` deixa de depender apenas de `Tags`.
3. A análise agora valida primeiro a coluna **Especialidade**.

## Regras por linha
- **Especialidade vazia** → `missing-specialty`
- **Psicologia** sem Demanda no arquivo → `psychology-missing-demand`
- **Psicologia** com Demanda não encontrada → `psychology-demand-not-found`
- **Nutrição/Fonoaudiologia** sem Demanda no arquivo → permitido, desde que exista Demanda padrão configurada no sistema
- **Nutrição/Fonoaudiologia** sem Demanda padrão configurada → `specialty-without-default-demand`
- **Demanda inativa** → `inactive-demand`
- **Categoria do lote vazia** → `missing-category`

## Compatibilidade adotada na base atual
A base atual ainda trabalha com a coleção plana `report_demands`. Para não reescrever todo o módulo neste passo, a resolução automática para Nutrição/Fonoaudiologia foi feita assim:

- procura Demandas da coleção `report_demands` vinculadas à Especialidade por campos opcionais
- prioriza uma Demanda marcada como padrão
- se existir apenas uma Demanda compatível com a Especialidade, usa essa Demanda
- se não houver correspondência única/padrão, marca inconsciência

### Campos opcionais aceitos na Demanda
- `specialtyName`
- `specialtyNameNormalized`
- `specialty`
- `specialtyNormalized`
- `especialidade`
- `especialidadeNormalized`
- arrays como `specialties`, `specialtyNames`, `defaultSpecialties`, `especialidades`
- flags de padrão como:
  - `isDefaultForSpecialty`
  - `defaultForSpecialty`
  - `useAsSpecialtyDefault`
  - `specialtyDefault`
  - `isSpecialtyDefault`

## Arquivos alterados
- `src/lib/shared/reportImportTemplate.js`
- `src/lib/server/reportImportAnalysis.js`
- `src/components/Admin/AdminReportImportView.js`
- `src/app/api/admin/report/pdf/route.js`

## Como validar
1. Importar planilha com **Especialidade** vazia em uma linha
2. Confirmar que a linha fica inconsistente e não entra como `ready`
3. Importar linha de **Psicologia** sem Demanda no arquivo
4. Confirmar status de inconsistência
5. Importar linha de **Nutrição/Fonoaudiologia** com Demanda vazia
6. Confirmar que só entra como `ready` se existir Demanda padrão/única do sistema para a Especialidade
7. Confirmar que o botão **Gerar PDF** só habilita quando `readyRows > 0`
