# Passo 21 — Auditoria de resíduos de cor (Permittá)

## Objetivo

Garantir que **não restou** nenhuma cor “solta” fora do padrão Permittá após a padronização via skins (`.skin-patient` / `.skin-admin`).

## Escopo

- Varredura em `src/` para:
  - classes Tailwind fora do padrão (ex.: `text-blue-*`, `bg-indigo-*`, `from-purple-*`, `violet-*` remanescentes)
  - gradientes e opacidades (ex.: `from-*`, `to-*`, `via-*`)
  - SVGs com `fill`/`stroke` hardcoded
  - estilos inline (`style={{ color: ... }}`)

## Critérios

- Ajustar para:
  - `brand-*` (quando é “accent”)
  - neutros (`slate-*`) quando é texto/estrutura
- **Não** alterar semântica de alertas:
  - erro: `red-*`
  - aviso: `amber/yellow-*`
  - sucesso: `green/emerald-*`

## Checklist de execução (técnico)

1) Buscar classes candidatas
- `violet-`
- `indigo-`
- `purple-`
- `blue-`
- `from-` / `to-` / `via-`

2) Revisar caso a caso (não fazer substituição cega)
- Se for destaque/CTA → migrar para `brand-*`
- Se for texto secundário → ajustar para `slate-*` coerente com o skin
- Se for fundo/superfície → manter consistência com as regras do skin

3) Validar visual
- Paciente (login + painel)
- Admin (dashboard + aba presença/faltas)
- Verificar:
  - foco/ring
  - hover
  - disabled
  - modais

## Entregável

- Um `.zip` com os arquivos ajustados.
- Um `.md` com:
  - lista de ocorrências encontradas
  - o que foi alterado e por quê
