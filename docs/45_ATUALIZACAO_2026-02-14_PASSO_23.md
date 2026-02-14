# Atualização — 2026-02-14 (Passo 23)

## Resumo
Padronização do topo do menu lateral do **Admin** com o mesmo branding do painel de acesso do paciente (logo Permittá + “Lembrete Psi” + “Constância terapêutica”), adicionando um chip discreto **Admin**.

## Motivação (produto + clínica)
- Consistência visual reforça a confiança e reduz ruído cognitivo.
- Admin é “bastidor” do cuidado; o chip **Admin** evita confusão de contexto.

## Mudanças técnicas
- `src/components/Admin/AdminPanelView.js`
  - Adicionado `next/image`.
  - Substituído cabeçalho antigo do sidebar por layout com logo + títulos.

## Como testar
1. Rodar local: `npm run dev`
2. Abrir `http://localhost:3000/admin`
3. Verificar no sidebar:
   - Logo + “Lembrete Psi”
   - “Constância terapêutica”
   - Chip “Admin”
   - Botão “Sair” funcional
