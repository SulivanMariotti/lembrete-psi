# 57 — Modelos de Relatório com editor livre + TAGS

## Objetivo
Trocar o cadastro anterior de modelos por uma estrutura previsível para operação real:
- cabeçalho em texto livre
- corpo em texto livre
- rodapé em texto livre
- inserção de TAGS automáticas
- preview do resultado

## Decisão
Abandonamos a montagem implícita por seleção de campos/ordem invisível.
O modelo agora define a ordem pelo próprio texto escrito no editor.

## Estrutura do modelo
Coleção: `report_templates`

Campos principais:
- `name`
- `description`
- `isActive`
- `editorMode = "tagTemplate"`
- `headerTemplate`
- `bodyTemplate`
- `footerTemplate`
- `pageFormat = "A4"`
- `pageOrientation = "landscape"`
- `itemsPerPage = 2`
- `layoutMode = "sideBySide"`

## TAGS suportadas
### Planilha
- `{{paciente}}`
- `{{profissional}}`
- `{{data_agendada}}`
- `{{data_criada}}`
- `{{procedimento}}`
- `{{convenio}}`
- `{{plano}}`
- `{{status}}`
- `{{status_secundario}}`
- `{{celular}}`
- `{{telefone}}`
- `{{cidade}}`
- `{{local}}`
- `{{unidade}}`
- `{{origem_agendamento}}`
- `{{tipo_atendimento}}`
- `{{valor}}`
- `{{recebido}}`
- `{{observacao}}`
- `{{motivo_bloqueio}}`
- `{{motivo_cancelamento}}`
- `{{nome_agendou}}`
- `{{tags}}`
- `{{codigo_paciente}}`
- `{{cpf}}`
- `{{data_nascimento}}`
- `{{entrada_paciente}}`
- `{{saida_paciente}}`
- `{{entrada_profissional}}`
- `{{saida_profissional}}`

### Demanda
- `{{demanda_nome}}`
- `{{demanda_descricao}}`

### Categoria escolhida no lote
- `{{categoria_numero}}`
- `{{categoria_titulo}}`
- `{{categoria_conteudo}}`

### Sistema
- `{{data_geracao}}`
- `{{modelo_nome}}`
- `{{indice_relatorio}}`
- `{{total_relatorios}}`

## Regra principal
A ordem visual do relatório é a ordem do texto no editor.
O sistema não reordena os dados.

## PDF
O gerador de PDF agora resolve:
- cabeçalho -> `headerTemplate`
- corpo -> `bodyTemplate`
- rodapé -> `footerTemplate`

Mantendo:
- A4
- paisagem
- 2 relatórios por página
- lado a lado

## Compatibilidade
Modelos antigos com estrutura de `header/footer/sections` são convertidos para a nova forma de texto na leitura, para evitar perda operacional.

## Validação manual
1. Abrir `/admin/report`
2. Ir em `Modelos`
3. Criar um modelo novo
4. Escrever cabeçalho, corpo e rodapé com TAGS
5. Salvar
6. Editar o mesmo modelo
7. Importar uma planilha
8. Gerar o PDF
9. Confirmar que a ordem no PDF segue a ordem do texto escrito
