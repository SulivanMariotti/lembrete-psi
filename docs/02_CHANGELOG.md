# Changelog — Sessão 2026-02-14

Este changelog resume os passos aplicados nesta sessão e os artefatos entregues.

---

## Passo 1 — Hotfix permission-denied (Paciente)
- Ajuste em `firestore.rules` para permitir leitura de `appointments` via claim `request.auth.token.phoneCanonical`.
- Objetivo: evitar erro no primeiro acesso pós-pareamento.

## Passo 2 — Smoke test
- Validar no console que a agenda do paciente carrega sem `permission-denied`.

## Passo 3 — Admin → Pacientes (compactar linhas/botões)
- Tabela com linhas menores e botões “Código/Editar/Desativar” mais compactos.

## Passo 4 — Admin → Pacientes (filtros e melhoria de carga)
- Filtros rápidos: Sem Push / Sem Contrato / Sem Código.
- Carga por meta (500/1000/2000) com enriquecimento posterior de Push para não travar.

## Passo 5 — Admin → Pacientes (padrão 8 + rolagem interna)
- Tabela com altura fixa (8 linhas visíveis) e rolagem interna.
- Cabeçalho sticky.

## Passo 6 — Admin → Pacientes (performance getAll)
- Backend otimizado para enriquecer status de Push usando leituras em lote.

## Passo 7 — Admin → Pacientes (paginação cursor)
- Paginação real por cursor no backend + “Carregar mais”.
- Correção adicional (Passo 7.1): ajuste de FieldPath/compatibilidade para evitar erro 500.

## Passo 8 — Admin → Pacientes (filtros server-side)
- Filtros passam a recarregar a lista já filtrada no servidor (não só no que está carregado).

## Passo 9 — Admin → Pacientes (busca inteligente server-side)
- Busca eficiente por telefone/e-mail/id externo para evitar carregar muitos registros.

## Passo 10 — Admin → Histórico (rolagem + layout)
- Primeira tentativa de rolagem + melhoria de layout.
- Passo 10.1 (fix real): `DesignSystem.js` ajustado com `min-h-0` no Card para liberar `overflow-y-auto`.

## Passo 11 — Admin → Histórico (filtros + busca)
- Período Hoje/7/30/Tudo + filtros por tipo + busca.

## Passo 12 — Admin → Histórico (modal detalhes + paginação)
- Clique abre modal com detalhes + copiar JSON.
- Paginação “Carregar mais” (200 por vez).

## Passo 13 — Admin → Histórico (Falhas de envio + Campanhas)
- Filtro “Falhas de envio”.
- Agrupamento por campanhas (48h/24h/Hoje/Misto/Disparo/Sem slot).

## Passo 13.1 — Corrigir labels com unicode literal
- Corrigido texto exibindo `\u00..` (acentos reais em PT-BR).

---

## Arquivos finais tocados nesta sessão
- `firestore.rules`
- `src/components/Admin/AdminPatientsTab.js`
- `src/app/api/admin/patients/list/route.js`
- `src/components/DesignSystem.js`
- `src/components/Admin/AdminHistoryTab.js`
