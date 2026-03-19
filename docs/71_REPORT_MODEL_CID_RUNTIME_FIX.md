# 71_REPORT_MODEL_CID_RUNTIME_FIX

## Objetivo
Corrigir o erro de runtime ao abrir a aba **Modelos** após a entrada da TAG `{{cid}}`.

## Causa
A mensagem informativa do componente React continha `{{cid}}` diretamente no JSX como texto bruto.

No JSX, esse padrão foi interpretado como expressão JavaScript e gerou:
- `ReferenceError: cid is not defined`

## Correção aplicada
A mensagem foi convertida para string explícita dentro do JSX, preservando a exibição literal da TAG:
- `{{cid}}`

## Arquivo alterado
- `src/components/Admin/AdminReportImportView.js`

## Como validar
1. Abrir `/admin/report`
2. Clicar na aba **Modelos**
3. Confirmar que a tela abre sem o erro `cid is not defined`
4. Verificar que a ajuda da área de TAGS continua mostrando `{{cid}}` corretamente
