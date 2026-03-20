# Admin / Análise — filtro na faixa 5 (Resultados encontrados)

## Objetivo
Adicionar um filtro visual na seção **5. Resultados encontrados** para separar rapidamente:
- todos os resultados
- apenas **duplicidade exata**
- apenas **conflito de profissional**

## Decisão
**Opção escolhida:** filtro local no frontend, sem nova chamada para API.

### Por quê
- a análise já retorna todos os grupos necessários
- o Admin consegue alternar a visualização sem reenviar a planilha
- reduz atrito operacional na conferência das duplicidades exatas

## Impacto
- não altera a regra de negócio
- não altera o motor server-side
- não altera exportação CSV
- muda apenas a experiência visual da seção 5

## Como ficou
Na faixa **5. Resultados encontrados** agora existem 3 opções:
1. **Todos os resultados**
2. **Só duplicidade exata**
3. **Só conflito de profissional**

Também foi adicionado um resumo visual com:
- total de grupos
- total de duplicidade exata
- total de conflito de profissional
- total atualmente exibido pelo filtro

## Validação
1. abrir `/admin/analise`
2. enviar a planilha `.xlsx`
3. clicar em **Analisar duplicidades**
4. ir até **5. Resultados encontrados**
5. alternar entre:
   - Todos os resultados
   - Só duplicidade exata
   - Só conflito de profissional
6. confirmar que a lista muda sem rodar a análise novamente
