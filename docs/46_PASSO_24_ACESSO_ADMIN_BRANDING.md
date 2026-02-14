# PASSO 24 — Branding na tela de Acesso Admin (/admin)

## Objetivo
Padronizar a **tela de Acesso Admin** com o mesmo cabeçalho de branding já usado no **login do Paciente** e no **menu lateral do Admin**:

- Logo Permittá (mark)
- Título: **Lembrete Psi**
- Subtítulo: **Constância terapêutica**
- Chip discreto: **Admin**

## Motivo (UX + olhar clínico)
- Mantém coerência visual do produto e reduz ruído cognitivo.
- Ajuda a separar claramente os contextos **Paciente** vs **Admin**, preservando o setting terapêutico.

## Alterações
- **Arquivo alterado**: `src/app/admin/page.js`
  - Adicionado `Image` (Next.js)
  - Inserido cabeçalho compacto (logo + Lembrete Psi + chip Admin) acima do card de login

## Critério de aceite
- A página **`/admin`** exibe o cabeçalho antes do formulário.
- O fluxo de login e o gate ("você está logado sem permissão") continuam iguais.
