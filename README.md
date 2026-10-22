# Seguir Criadora

Monorepo do projeto **Seguir Criadora**. Nesta etapa existe apenas a base de
infraestrutura da API; o frontend React será adicionado em `/front` depois.

## Estrutura

```
.
├── back/                  # API NestJS + TypeORM
│   ├── src/
│   │   ├── config/        # validação das variáveis de ambiente
│   │   ├── database/      # DataSource e migrations
│   │   ├── entities/      # Creator, User, Follower
│   │   ├── health/        # GET /health
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── Dockerfile
├── docker-compose.yml     # postgres + api
└── .env.example
```

## Como subir

Pré-requisitos: Docker e Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

- API: <http://localhost:3000>
- Health check: <http://localhost:3000/health>
- PostgreSQL: `localhost:5432` (credenciais definidas no `.env`)

A API aguarda o PostgreSQL ficar saudável e executa as migrations
automaticamente na inicialização (`migrationsRun: true`).

## Banco de dados

| Tabela      | Colunas                                                       |
| ----------- | ------------------------------------------------------------- |
| `creators`  | `id` (uuid, PK), `name`, `created_at`                         |
| `users`     | `id` (uuid, PK), `name`, `created_at`                         |
| `followers` | `creator_id` (FK), `user_id` (FK), `created_at`, PK composta  |

As FKs de `followers` usam `ON DELETE CASCADE`. A migration de seed cria duas
criadoras fictícias com UUIDs fixos.

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

## Parar

```bash
docker compose down          # mantém o volume
docker compose down -v       # remove também os dados
```
