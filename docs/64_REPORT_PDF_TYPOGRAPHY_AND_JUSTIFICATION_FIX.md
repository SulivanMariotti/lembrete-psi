# 64 — Ajuste tipográfico do PDF de relatórios

## Objetivo
Melhorar a composição do texto no PDF para reduzir:
- letras encavaladas no cabeçalho
- espaçamento exagerado em parágrafos justificados
- sensação de layout apertado

## Ajustes aplicados
- Nova estimativa de largura por caractere, com pesos diferentes para:
  - letras estreitas
  - letras largas
  - maiúsculas
  - espaços
- Cálculo de largura dos espaços mais estável
- Justificação com limite de expansão por espaço
- Justificação só aplicada quando a linha realmente comporta esse ajuste
- Mais respiro no cabeçalho e no rodapé
- Fonte base do corpo levemente reduzida para evitar colisão

## Efeito esperado
- Cabeçalho quebrando melhor
- Menos sobreposição entre caracteres
- Parágrafos com leitura mais natural
- Menos “buracos” entre palavras no corpo do relatório

## Validação sugerida
1. Gerar um PDF com cabeçalho longo
2. Validar se o título não fica encavalado
3. Validar se o corpo não abre espaços exagerados entre palavras
4. Validar com e sem logo
