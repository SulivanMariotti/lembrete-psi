# Atualização — 2026-02-14 (PASSO 27)

## Resumo
Implementado o **Painel de Saúde do Sistema** no Dashboard Admin, incluindo:
- indicador do **último backup local** (registrado no Firestore ao rodar `npm run backup:local`), sem expor caminhos do computador;
- bloco de **Risco (2+ faltas)** reaproveitando o cálculo de constância;
- indicador de **falhas de lembretes nas últimas 24h** (proxy de erro operacional);
- atalhos de leitura para **importações recentes** (presença/faltas e agenda), via `history`.

## Arquivos
- `docs/50_PASSO_27_PAINEL_SAUDE_SISTEMA.md`

