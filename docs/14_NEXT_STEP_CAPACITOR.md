# Próximo passo — Capacitor (APP mantendo WEB)

## Objetivo
Transformar o projeto em **APP** usando **Capacitor**, mantendo **WEB** via browser.

## Estratégia (Opção A — recomendada para começar)
O APP será um **shell nativo** (Android/iOS) que aponta para a **URL do Vercel**:
- Mantém SSR e rotas `/api` funcionando (sem build estático)
- Permite adicionar recursos nativos depois (push nativo, splash, deep links, biometria)

## Passo a passo (1 por vez)
### Passo 1 — Instalar e inicializar
No terminal, na raiz do projeto:

1) Instalar:
```bash
npm i @capacitor/core @capacitor/cli
```

2) Inicializar (exemplo):
- App Name: `Lembrete Psi`
- App ID: `com.permitta.lembretepsi`

```bash
npx cap init "Lembrete Psi" "com.permitta.lembretepsi" --web-dir=out
```

✅ Quando finalizar o Passo 1, responda **ok** para seguirmos.

### Passo 2 — Apontar para Vercel (server.url) + plataformas
- Ajustar `capacitor.config.*` com `server.url`
- `npx cap add android`
- `npx cap add ios`
- `npx cap sync`

### Passo 3 — Smoke checks no APP
- Abrir “Painel do Paciente”
- Validar navegação, assets, autenticação/fluxos e rotas `/api`
