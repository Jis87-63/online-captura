# Aviator Bot (Render / Railway)

Bot Node.js com Puppeteer + Express para login automático no site, captura de multiplicadores do Aviator e API REST para consumo externo.

## Rotas
- `GET /` status do serviço
- `GET /health` healthcheck para plataformas de deploy
- `GET /api/velas` retorna últimos registros em memória
- `POST /api/velas` adiciona registro manualmente

## Variáveis de ambiente
Copie `.env.example` e configure:

- `MEGAGAME_USER` (obrigatória)
- `MEGAGAME_PASS` (obrigatória)
- `PORT` (opcional, padrão `3000`)
- `HEADLESS` (opcional, padrão `true`)
- `MAX_REGISTROS` (opcional, padrão `100`)
- `CAPTURE_INTERVAL_MS` (opcional, padrão `3000`)

## Rodar local
```bash
cd aviator-bot
npm install
npm start
```

## Deploy no Render
Este repositório já possui `render.yaml` na raiz.

Se preferir configurar manualmente:
- **Root Directory**: `aviator-bot`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

## Deploy no Railway
Este repositório já possui `railway.toml` na raiz.

Configuração manual equivalente:
- **Build**: Nixpacks
- **Start Command**: `cd aviator-bot && npm start`
- **Healthcheck Path**: `/health`

## PM2 (VPS)
```bash
cd aviator-bot
npm install
pm2 start bot.js --name aviator-bot
pm2 save
pm2 startup
```


## Fluxo recomendado para evitar conflitos de PR (GitHub)
Sempre antes de abrir PR, sincronize sua branch com a `main`:

```bash
git fetch origin
git checkout sua-branch
git rebase origin/main
# resolva conflitos se aparecer
git add .
git rebase --continue
git push --force-with-lease
```

Se preferir merge ao invés de rebase:

```bash
git fetch origin
git checkout sua-branch
git merge origin/main
git push
```

### Dicas rápidas
- Evite editar os mesmos trechos em paralelo em múltiplas branches.
- Faça PRs pequenos (menos chance de conflito).
- Padronização de fim de linha está definida em `.gitattributes` para reduzir conflitos por EOL.
