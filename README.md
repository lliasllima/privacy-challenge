# Seguir Criadora

Monorepo do projeto **Seguir Criadora**: API NestJS em `/back` e frontend
React + Vite em `/front`, com PostgreSQL, API e front orquestrados pelo
`docker-compose.yml`.

## Estrutura

```
.
├── back/                  # API NestJS + TypeORM
│   ├── src/
│   │   ├── common/        # filtro global de exceções
│   │   ├── config/        # validação das variáveis de ambiente
│   │   ├── creators/      # módulo de criadoras
│   │   ├── database/      # DataSource e migrations
│   │   ├── entities/      # Creator, User, Follower
│   │   ├── followers/     # módulo de seguidores
│   │   ├── health/        # GET /health
│   │   ├── users/         # módulo de usuários
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/              # testes e2e (Jest + supertest, PostgreSQL real)
│   └── Dockerfile
├── front/                 # React + TypeScript + Vite (nginx em produção)
│   ├── src/               # App, cliente da API e CSS
│   ├── nginx.conf         # proxy /api/ -> api:3000
│   └── Dockerfile
├── docker-compose.yml     # postgres + api + front (+ api-test no profile test)
└── .env.example
```

## Como subir

Pré-requisitos: Docker e Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: <http://localhost:8080>
- API: <http://localhost:3000>
- Health check: <http://localhost:3000/health>
- PostgreSQL: `localhost:5432` (credenciais definidas no `.env`)

O front chama sempre `/api/...`; o nginx faz proxy para a API removendo o
prefixo `/api`, então não há CORS. A API aguarda o PostgreSQL ficar saudável e
executa as migrations automaticamente na inicialização (`migrationsRun: true`).

## Endpoints

| Método   | Rota                                          | Resposta                                  |
| -------- | --------------------------------------------- | ----------------------------------------- |
| `POST`   | `/users`                                      | `201 {id, name}`                          |
| `GET`    | `/creators`                                   | `200 [{id, name}]`                        |
| `GET`    | `/creators/:creatorId`                        | `200 {id, name}` / `404`                  |
| `POST`   | `/creators/:creatorId/followers`              | `201` na 1ª vez, `200` se já seguia        |
| `DELETE` | `/creators/:creatorId/followers/:userId`      | `204` (idempotente)                       |
| `GET`    | `/creators/:creatorId/followers/count`        | `200 {creatorId, count}`                  |
| `GET`    | `/creators/:creatorId/followers/:userId`      | `200 {following}`                         |
| `GET`    | `/health`                                     | `200 {status, database, ...}`             |

Regras:

- `404` quando a criadora ou o usuário não existem.
- `400` para UUID inválido (`ParseUUIDPipe`) ou body inválido
  (`class-validator` + `ValidationPipe` global com `whitelist` e
  `forbidNonWhitelisted`).
- O `/count` usa `COUNT(*)` na tabela `followers`; não existe coluna de contador.
- Seguir é idempotente via `INSERT ... ON CONFLICT DO NOTHING` apoiado na PK
  composta `(creator_id, user_id)`, seguro sob concorrência.
- Erros sempre no mesmo envelope JSON:
  `{statusCode, error, message, path, timestamp}`.

## Banco de dados

| Tabela      | Colunas                                                       |
| ----------- | ------------------------------------------------------------- |
| `creators`  | `id` (uuid, PK), `name`, `created_at`                         |
| `users`     | `id` (uuid, PK), `name`, `created_at`                         |
| `followers` | `creator_id` (FK), `user_id` (FK), `created_at`, PK composta  |

As FKs de `followers` usam `ON DELETE CASCADE`. A migration de seed cria duas
criadoras fictícias com UUIDs fixos. Os `id` de `creators` e `users` usam
`gen_random_uuid()` como default (migration
`AddUuidDefaultsToCreatorsAndUsers`), então novos registros recebem UUID v4 do
próprio PostgreSQL.

Inspecionar o banco:

```bash
set -a; . ./.env; set +a
docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c '\dt'
docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" \
  -c 'SELECT id, name FROM creators ORDER BY name;'
```

## Desenvolvimento local (sem container da API)

```bash
cd back
npm install
cp ../.env.example ../.env   # se ainda não existir
npm run start:dev
```

Variáveis `DB_HOST`/`DB_PORT` do `.env` apontam para `localhost:5432`. Dentro do
Compose, `DB_HOST` é sobrescrito para `postgres`.

## Migrations

```bash
cd back
npm run migration:show
npm run migration:run
npm run migration:revert
```

O TypeORM está configurado com `synchronize: false`; alterações de schema devem
ser feitas por migrations.

## Frontend

Tela única em React + TypeScript + Vite, servida por nginx:

- Mostra a primeira criadora de `GET /creators`, o total de seguidores e o botão
  **Seguir** / **Deixar de seguir**.
- Na primeira visita cria um usuário `Visitante-xxxx` via `POST /users` e guarda
  o `userId` no `localStorage`. Se o id guardado não existir mais no backend
  (404/400), cria outro automaticamente.
- Consulta `GET /creators/:id/followers/:userId` ao carregar para refletir o
  estado real do botão.
- Atualiza o contador por polling a cada 5 segundos e imediatamente após cada
  clique; o botão fica desabilitado durante a requisição e erros aparecem em
  texto simples.
- Sem bibliotecas de UI: apenas CSS.

Desenvolvimento local do front (API precisa estar em `localhost:3000`):

```bash
cd front
npm install
npm run dev   # http://localhost:5173, proxy /api configurado no vite.config.ts
```

Em produção (Compose), o nginx serve `front/dist` e faz proxy de `/api/` para
`http://api:3000/` (sem CORS).

## Testes e2e

Os testes rodam contra PostgreSQL real (sem mock nem SQLite), em um banco
separado no mesmo container:

```bash
docker compose down -v                 # opcional: começa do zero
docker compose run --rm --build api-test
```

O serviço `api-test` está no profile `test`, então não sobe com
`docker compose up`. O banco de testes (`TEST_DB_NAME`, default
`followers_test`) é criado automaticamente pelo `test/global-setup.js`, que
recusa qualquer nome que não termine em `_test` para nunca tocar no banco de
desenvolvimento. As migrations rodam no boot da aplicação de teste e
`followers`/`users` são limpos entre os casos.

Detalhes:

- `back/test/app.e2e-spec.ts`: suíte e2e.
- `back/test/jest-e2e.json`: configuração do Jest.
- `back/test/setup-env.ts`: força `DB_NAME = TEST_DB_NAME` antes de carregar o
  `AppModule`.
- Rodar localmente (com o Postgres do Compose de pé):
  `cd back && npm test`.

## Parar

```bash
docker compose down          # mantém o volume
docker compose down -v       # remove também os dados
```
