# Cores Permittá via Skins (Paciente + Admin)

## Objetivo
Aplicar a identidade Permittá com **baixo risco** e **sem refatorar** todos os componentes, mantendo alertas (erro/aviso/sucesso) com cores tradicionais.

## Estratégia
- Implementação via CSS em `src/app/globals.css`:
  - `.skin-patient` → afeta apenas PatientLogin + PatientFlow
  - `.skin-admin` → afeta apenas Admin UI
- A estratégia troca “violet-*” por “brand-*” **somente dentro do skin**.
- Também harmoniza superfícies (`bg-*`), bordas (`border-*`), sombras (`shadow-*`) e contraste de textos.

## O que NÃO é afetado
- Alertas e estados semânticos:
  - `red-*` (erro)
  - `amber/yellow-*` (aviso)
  - `green/emerald-*` (sucesso)

## Onde fica aplicado
- `src/app/page.js` envolve as áreas com:
  - `<div className="skin-patient">…</div>`
  - `<div className="skin-admin">…</div>`

## Troubleshooting (quando “não muda”)
Em ambiente local, pode haver cache do Next/Turbopack e do browser.

1. Pare o servidor: **Ctrl + C**
2. Apague a pasta `.next` na raiz do projeto
3. Rode `npm run dev`
4. No browser: **Ctrl + Shift + R** (hard refresh)

## Próxima melhoria (opcional)
Realizar **auditoria de resíduos de cor** (Passo 21): procurar classes fora do padrão (ex.: `text-blue-*`, `bg-indigo-*`, `from-purple-*`) e ajustar pontualmente.

Detalhe: `docs/40_PASSO_21_AUDITORIA_CORES.md`.
