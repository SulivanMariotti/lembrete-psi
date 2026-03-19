# STEP50 — Base de Relatórios com Upload de Planilha

## Objetivo
Criar a rota administrativa `/admin/report` com um fluxo inicial de upload e pré-análise da planilha base enviada nesta conversa, sem persistir dados ainda.

## O que foi implementado
- Nova rota **`/admin/report`**
- Tela admin dedicada para:
  - selecionar arquivo `.xlsx`
  - enviar para análise server-side
  - validar cabeçalhos do layout
  - exibir resumo do arquivo
  - exibir prévia dos primeiros registros normalizados
- Endpoint protegido:
  - **`POST /api/admin/report/import`**
- Parser interno leve para `.xlsx`:
  - leitura de workbook/aba
  - leitura de cabeçalhos e linhas
  - suporte ao layout enviado na conversa

## Assumido neste passo
- A leitura usa a **primeira aba** do arquivo
- O layout esperado é o modelo **Amplimed - Gestão de Clínicas**
- Neste passo, o processo é somente de **pré-importação**
- **Nenhum dado é salvo** em Firestore, histórico ou auditoria ainda
- A próxima etapa definirá:
  - regras de consolidação
  - filtros
  - métricas
  - exportações
  - persistência temporária ou não

## Estrutura do layout base mapeado
- Quantidade de colunas esperadas: **68**
- Principais campos já preparados para preview:
  - Status de registro
  - Profissional
  - Paciente
  - Data e hora Agendada
  - Status
  - Convênio
  - Procedimento
  - Celular
  - Origem agendamento

## Regras de validação atuais
- Aceita apenas `.xlsx`
- Limite de arquivo: **10 MB**
- Compara o cabeçalho recebido com o layout base normalizado
- Retorna:
  - colunas reconhecidas
  - colunas ausentes
  - colunas extras
  - quantidade de linhas válidas
  - profissionais distintos
  - status encontrados
  - convênios encontrados

## Arquivos envolvidos
- `src/app/admin/report/page.js`
- `src/components/Admin/AdminReportImportView.js`
- `src/app/api/admin/report/import/route.js`
- `src/lib/server/xlsxLite.js`
- `src/lib/shared/reportImportTemplate.js`

## Como validar
1. Acessar `/admin/report`
2. Entrar com credencial de admin
3. Selecionar a planilha base enviada nesta conversa
4. Confirmar se:
   - o upload funciona
   - a planilha é lida
   - o resumo aparece
   - a prévia aparece
   - a validação do cabeçalho informa compatibilidade do layout
5. Confirmar que:
   - nenhum dado novo foi gravado no banco
   - a rota continua isolada do restante do admin

## Próximo encaixe esperado
Quando o requisito funcional dos relatórios chegar, usar esta base para decidir:
- relatório operacional
- relatório por profissional
- relatório por status
- relatório por convênio
- relatório financeiro
- relatório de faltas / presença / comparecimento
- cruzamento por período e origem
