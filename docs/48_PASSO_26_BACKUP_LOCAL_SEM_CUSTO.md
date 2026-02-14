# Passo 26 — Backup local do Firestore (sem bucket / sem custo de Storage)

Este passo cria um **backup local** dos dados do Firestore em arquivos compactados.

> Importante (clínico + LGPD): backup contém **dados sensíveis** (agenda, presença/faltas, notas). Trate como prontuário: acesso restrito, armazenamento seguro e nunca publique/commite.

## O que foi adicionado

- Script: `scripts/backup-firestore.mjs`
- Comando: `npm run backup:local`
- `.gitignore`: passou a ignorar `backups/` e `*.jsonl.gz`

## O que esse backup faz

- Exporta (por padrão) as coleções:
  - `config`, `users`, `subscribers`, `appointments`, `attendance_logs`, `patient_notes`, `history`, `admins`
- Gera 1 arquivo por coleção em **JSONL** (uma linha por documento) e compacta em **`.jsonl.gz`**
- Gera `manifest.json` com contagem de documentos exportados

## O que esse backup NÃO faz

- Não faz restore automático (a restauração é um passo separado)
- Não inclui subcoleções internas (se houver)

## Pré-requisitos (autenticação Admin SDK)

O script precisa de credenciais do Firebase Admin. Você pode fornecer de 3 formas:

### Opção 1 (mais simples) — apontar para o JSON local

1) Coloque seu `serviceAccount.json` em uma pasta segura **fora do repo**.
2) No arquivo `.env.local` (na raiz do projeto), adicione:

`SERVICE_ACCOUNT_JSON_PATH=C:\\caminho\\seguro\\serviceAccount.json`

### Opção 2 — Base64 do JSON

1) Gere Base64 (PowerShell):

```powershell
$json = Get-Content .\serviceAccount.json -Raw
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)) | Set-Clipboard
```

2) Cole em `.env.local`:

`FIREBASE_ADMIN_SERVICE_ACCOUNT_B64=...`

### Opção 3 — JSON string direto

Se você já tem `FIREBASE_ADMIN_SERVICE_ACCOUNT` no `.env.local`, o script também usa.

## Como rodar (Windows)

1) Na raiz do projeto, abra o terminal.
2) Execute:

```bash
npm run backup:local
```

3) O backup será criado em:

`./backups/firestore_YYYY-MM-DD_HH-mm-ss/`

4) Copie a pasta gerada para um local seguro (Drive/HD externo).

## Opções úteis

- Definir pasta de saída:

```bash
npm run backup:local -- --out ./backups/meu-backup
```

- Exportar apenas algumas coleções:

```bash
npm run backup:local -- --collections users,appointments,attendance_logs
```

- Exportar todas as coleções (se o projeto crescer):

```bash
npm run backup:local -- --all
```

- Ajustar tamanho do lote (se sua base ficar grande):

```bash
npm run backup:local -- --batch 250
```

## Observação sobre custo

Este backup é “sem custo de Storage” (sem bucket), mas **faz leituras no Firestore**, o que pode consumir cota (especialmente em bases grandes). Recomenda-se rodar:

- 1x por semana, e
- sempre antes de mudanças grandes (importações, refactors, migrações)
