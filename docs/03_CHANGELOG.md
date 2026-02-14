# Changelog

## 2026-02-11
- Fix: Contrato Terapêutico não carregava no paciente (garantir carregamento de `globalConfig` também no modo paciente).
- Fix/UX: Histórico Admin com fallback `createdAt/sentAt` e labels amigáveis PT-BR.
- UX: Admin → Pacientes com flags/pílulas para Notificações, Cadastro e Contrato (Aceito/Pendente).
- Fix: Notificações do paciente sem `permission-denied` (status/registro via `/api/patient/push/*`).
- Fix: Resolver telefone automaticamente quando ausente (`/api/patient/resolve-phone`).
- Feature: Login do paciente por **Código de Vinculação** (telefone + código).
  - Código: formato amigável + armazenamento seguro (hash+salt) + **single-use**
  - Admin: gerar e copiar código; lista mostra status do código (Sem/Ativo/Usado/Revogado + last4)
  - Paciente: vincular aparelho com telefone + código; bloquear reuso do código.

## Observação operacional
- Alguns ajustes de caminho de arquivos/rotas foram feitos localmente durante integração (rota do pair-code).
