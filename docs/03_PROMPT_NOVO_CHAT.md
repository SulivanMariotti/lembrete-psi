# Prompt para iniciar um novo chat — Lembrete Psi (2026-02-14)

Cole este texto no início do novo chat (e anexe o zip mais atualizado do projeto + os .md deste pack).

---

Você é um desenvolvedor master full stack e vai trabalhar no projeto **Lembrete Psi** (Next.js + Firebase).
Vamos continuar **de onde paramos**: último passo aplicado foi **Passo 13.1** (Admin → Histórico: corrigir labels unicode).
Nesta sessão foram feitas melhorias em:
- Admin → Pacientes: tabela compacta, padrão 8 linhas com rolagem interna, filtros (Sem Push/Sem Contrato/Sem Código), performance (getAll), paginação por cursor, filtros server-side, busca inteligente.
- Admin → Histórico: rolagem interna, filtros e busca, modal de detalhes com copiar JSON, paginação (200 por vez), filtro “Falhas de envio” e agrupamento por “Campanhas” (48h/24h/Hoje etc.), e correção de acentos.

Diretriz clínica/UX do produto: o painel do paciente é para **lembrar** e **conscientizar** sobre presença/constância; evitar CTAs que facilitem cancelamento/remarcação.

**Agora quero seguir com o Passo 14**:
- Garantir que logs de falha individual (`push_reminder_failed`) carreguem `reminderType/slot` (48h/24h/Hoje) para o agrupamento “Campanhas” ficar 100% fiel.
- Entregar apenas os arquivos alterados (100% do conteúdo do arquivo), em zip, para eu substituir.

Siga o método “um passo por vez” e só avance quando eu disser “ok”.
