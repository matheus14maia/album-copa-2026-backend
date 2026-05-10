# API — Álbum Copa 2026

API **Node 20** + **Fastify** + **Prisma** + **PostgreSQL**. Autenticação via **JWT do Clerk** (`Authorization: Bearer`). Eventos **SSE** em `GET /v1/me/stream` para outras abas/dispositivos refetcharem a coleção após mudanças.

## Repositório no GitHub (backend)

Este diretório deve ser a **raiz** do repositório que você conecta na **Render** (ex.: `github.com/seu-usuario/album-copa-2026-api`). O arquivo [`render.yaml`](render.yaml) do Blueprint e o `package.json` da API ficam na raiz do remoto — não aninhe o backend dentro de outra pasta no GitHub, salvo se ajustar o *root* do serviço no painel.

## Pré-requisitos

- **Node.js 20+** e **npm** (ou pnpm, se preferir adaptar os comandos).
- **Docker Desktop** (opcional, recomendado para Postgres + API via Compose na raiz do monorepo).
- Conta **Clerk** com aplicação de desenvolvimento (para `CLERK_SECRET_KEY`).

## Variáveis de ambiente

Copie [`.env.example`](.env.example) para `.env` e ajuste:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL (local, Docker ou Render). |
| `CLERK_SECRET_KEY` | Secret key do Clerk (Dashboard → API Keys). Usada para validar o Bearer JWT. |
| `FRONTEND_ORIGINS` | Lista separada por **vírgula** das origens permitidas no CORS (ex.: `http://localhost:3000`, URL da Vercel). |
| `PORT` | Porta HTTP (padrão `4000`). No Render, use a variável `PORT` injetada pela plataforma. |
| `HOST` | Interface de bind (ex.: `0.0.0.0` em Docker/Render). |

## Rodar com Docker Compose (recomendado)

Na **raiz** do monorepo (pasta pai que contém `docker-compose.yml`):

1. Crie `.env` na raiz com pelo menos `CLERK_SECRET_KEY=...` (veja [`.env.example`](../.env.example)).
2. `docker compose up --build`
3. Na primeira vez, popule o catálogo de figurinhas:  
   `docker compose exec api npx prisma db seed`
4. Teste saúde: `curl http://localhost:4000/health` → deve retornar `{"ok":true}`.

A API ficará em **http://localhost:4000**. O frontend local (`http://localhost:3000`) deve estar listado em `FRONTEND_ORIGINS` (valor padrão do compose já inclui localhost:3000).

### Problemas comuns (Docker)

- **Porta 5432 ou 4000 em uso**: altere o mapeamento em `docker-compose.yml` ou pare o serviço que ocupa a porta.
- **Postgres “connection refused”**: aguarde o healthcheck do serviço `postgres` ficar saudável antes do `api` subir.
- **401 nas rotas `/v1/me/*`**: token inválido ou `CLERK_SECRET_KEY` errada; confira se o frontend usa o **mesmo** projeto Clerk.

## Rodar só no host (sem Docker da API)

1. Suba um PostgreSQL acessível e defina `DATABASE_URL` no `.env` desta pasta.
2. `npm install`
3. `npx prisma migrate dev` (ou `npx prisma migrate deploy` se for só aplicar migrations existentes).
4. `npx prisma db seed` (uma vez, para criar as ~994 figurinhas do catálogo oficial: FWC, seleções × 20 e Coca-Cola). Rodar o seed **apaga** figurinhas e coleções (`UserSticker`) existentes — em produção só execute quando aceitar esse reset.
5. `npm run dev` — servidor em modo watch em `http://localhost:4000`.

## Scripts npm

| Script | Função |
|--------|--------|
| `npm run dev` | Desenvolvimento com `tsx watch`. |
| `npm run build` | Compila TypeScript para `dist/`. |
| `npm start` | Só `node dist/index.js` (use após build). |
| `npm run start:prod` | `prisma migrate deploy` + `node dist/index.js` (útil em ambientes sem entrypoint separado). |

## Rotas principais

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/health` | Não | Health check. |
| `GET` | `/v1/stickers` | Não | Catálogo de figurinhas (códigos alfanuméricos: `FWC 0`…`FWC 19`, `{SIGLA}1`…`{SIGLA}20`, `CC1`…`CC14`). |
| `GET` | `/v1/me/collection` | Sim | Coleção do usuário. |
| `PATCH` | `/v1/me/collection/:stickerId` | Sim | Corpo JSON `{ "ownedCount": number }`. Atualiza repetidas derivadas. |
| `GET` | `/v1/me/stream` | Sim | SSE (reconexão com backoff no cliente). |

## Deploy no Render (repositório só com o backend na raiz)

1. Faça push deste código para um repositório Git (GitHub/GitLab/Bitbucket) onde a **raiz** seja esta pasta `backend/` (ou use um repositório dedicado contendo apenas estes arquivos).
2. No Render, use o Blueprint com o arquivo [`render.yaml`](render.yaml) ou crie **Web Service** + **PostgreSQL** manualmente.
3. Defina as variáveis secretas no painel:
   - `CLERK_SECRET_KEY`
   - `FRONTEND_ORIGINS` — inclua a URL exata do site na Vercel (ex.: `https://seu-app.vercel.app`), sem barra final; pode listar várias separadas por vírgula.
4. O `DATABASE_URL` no Blueprint vem do banco `album-db` via `fromDatabase`.
5. Após o primeiro deploy, se o catálogo estiver vazio, execute **one-off shell** ou job com: `npx prisma db seed` (ou equivalente no painel).

Valide o Blueprint localmente (com [Render CLI](https://render.com/docs/cli) instalado e logado):

```bash
render blueprints validate
```

Link direto (substitua a URL do repo HTTPS):

`https://dashboard.render.com/blueprint/new?repo=https://github.com/SEU_USUARIO/SEU_REPO_BACKEND`

### Plano gratuito e SSE

Instâncias gratuitas podem **hibernar**; conexões SSE caem após inatividade. O frontend reconecta com backoff e refaz fetch ao focar a janela.

## CORS

Somente origens em `FRONTEND_ORIGINS` podem chamar a API com credenciais/cabeçalhos customizados em navegadores. Sempre inclua **localhost** em desenvolvimento e a **URL de produção** do frontend.
