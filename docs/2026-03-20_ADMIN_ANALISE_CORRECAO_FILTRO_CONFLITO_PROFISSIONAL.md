# Correção — filtro “Só conflito de profissional” em `/admin/analise`

## Problema
O filtro visual da faixa **5. Resultados encontrados** não separava corretamente os grupos de conflito de profissional.

## Causa raiz
A interface estava filtrando por `conflito_profissional`, mas o backend devolve os grupos desse tipo com o identificador:

- `conflito_profissional_mesma_especialidade`

Com isso, o recorte retornava zero ou comportamento incorreto, mesmo havendo grupos válidos.

## Ajuste aplicado
Foi corrigido o valor da opção do filtro visual para usar exatamente o `type` retornado pelo backend.

## Impacto
- **Todos os resultados** continua igual
- **Só duplicidade exata** continua igual
- **Só conflito de profissional** agora mostra corretamente apenas os grupos desse tipo

## Como validar
1. Acessar `/admin/analise`
2. Enviar a planilha `.xlsx`
3. Clicar em **Analisar duplicidades**
4. Ir até **5. Resultados encontrados**
5. Selecionar **Só conflito de profissional**
6. Confirmar que a lista exibe apenas grupos de conflito de profissional na mesma especialidade

## Arquivo alterado
- `src/components/Admin/AdminAnalysisView.js`
