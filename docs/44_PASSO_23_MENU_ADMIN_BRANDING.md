# Passo 23 — Menu Admin com branding (logo + “Lembrete Psi”)

## Objetivo
Ajustar o topo do menu lateral do **Admin** para refletir o mesmo padrão visual do painel de acesso do paciente (PatientLogin), reforçando identidade do produto e consistência estética.

## Diretriz clínica aplicada
- Admin é “bastidor” do cuidado: manter a marca **Lembrete Psi** e a ideia de **constância terapêutica**.
- Diferenciar claramente o contexto com um *chip* discreto **Admin**, para não confundir com o painel do paciente.

## O que mudou
- Substituído o cabeçalho do sidebar (antes: “Painel / Admin”) por:
  - Logo Permittá (mark) em bloco arredondado com ring/sombra
  - Título **Lembrete Psi**
  - Subtítulo **Constância terapêutica**
  - Chip **Admin**
  - Botão **Sair** preservado

## Arquivo alterado
- `src/components/Admin/AdminPanelView.js`

## Critérios de aceite
- Em `/admin`, o sidebar mostra logo + “Lembrete Psi” + “Constância terapêutica” + chip “Admin”.
- O botão “Sair” permanece funcional.
- Sem criação de CTA de cancelamento/remarcação (diretriz do produto).
