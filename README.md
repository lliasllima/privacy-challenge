# Seguir Criadora

## Visão geral

Aplicação de tela única para seguir uma criadora. O frontend mostra a primeira
criadora retornada pela API, o número de seguidores e um botão **Seguir** /
**Deixar de seguir**.

Na primeira visita, o frontend cria um usuário visitante via `POST /users`
(nome no formato `Visitante-xxxx`) e guarda o `userId` no `localStorage`. Ao
carregar, consulta o estado real em `GET /creators/:creatorId/followers/:userId`.
Se o `userId` guardado não existir mais na API, um novo visitante é criado
automaticamente. O contador é atualizado por polling a cada 5 segundos e também
logo após cada clique.

O repositório é um monorepo:

- `back/`: API NestJS + TypeORM.
- `front/`: React + TypeScript + Vite, servido por nginx.
- `docker-compose.yml`: serviços `postgres`, `api`, `front` e `api-test`.
- `.env.example`: modelo das variáveis de ambiente.

## Stack

| Camada        | Tecnologia                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| Backend       | NestJS 11, TypeScript 5.9, TypeORM 0.3, class-validator, class-transformer |
| Banco         | PostgreSQL 16 (`postgres:16-alpine`)                                       |
| Frontend      | React 19, TypeScript 5.9, Vite 6                                           |
| Servidor web  | nginx 1.29 (`nginx:1.29-alpine`)                                           |
| Testes        | Jest 29, ts-jest, supertest, PostgreSQL real                               |
| Infraestrutura| Docker Compose, Node 22 Alpine                                             |

## Como subir

Pré-requisito: Docker com Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Serviços e portas padrão (definidos em `docker-compose.yml` e `.env.example`):

| Serviço    | URL / porta                         |
| ---------- | ----------------------------------- |
| `front`    | <http://localhost:8080>             |
| `api`      | <http://localhost:3000>             |
| `postgres` | `localhost:5432`                    |

O `docker-compose.yml` define `DB_HOST: postgres` para os serviços `api` e
`api-test`; no `.env.example`, `DB_HOST` é `localhost` para uso fora do Compose.
Defina uma senha própria em `DB_PASSWORD` no `.env` para qualquer ambiente que
não seja local: o valor em `.env.example` é um placeholder de desenvolvimento,
não um segredo real, e o `.env` não é versionado.

Na subida, a API aguarda o PostgreSQL ficar saudável e executa as migrations
automaticamente (`synchronize: false`, `migrationsRun: true`). O frontend só
inicia depois que a API está saudável.

O frontend chama sempre `/api/...`; o nginx faz proxy de `/api/` para
`http://api:3000/`, removendo o prefixo e evitando CORS.

Para encerrar:

```bash
docker compose down
```

## Como rodar os testes

Os testes e2e usam PostgreSQL real em um banco separado (`followers_test` por
padrão, configurável por `TEST_DB_NAME`) e limpam `followers` e `users` entre os
casos. O banco de desenvolvimento não é usado.

Para executar do zero (remove o volume do PostgreSQL) e rodar a suíte:

```bash
docker compose down -v
docker compose --profile test run --rm --build api-test
```

O serviço `api-test` está no profile `test`, então não sobe junto com
`docker compose up --build`. Ele usa o estágio `test` de `back/Dockerfile`, cujo
comando é `npm run test:e2e`. O banco de teste é criado pelo
`back/test/global-setup.js`; nomes de banco que não terminam em `_test` são
recusados.

## Endpoints

Base direta da API: `http://localhost:3000`. Para passar pelo proxy do nginx,
use `http://localhost:8080/api` e mantenha o mesmo caminho (sem `/api` no
caminho interno).

Antes dos exemplos, defina os IDs usados nos comandos:

```bash
# UUID fixo da criadora "Lia Monteiro" (migration de seed)
CREATOR_ID=5d3a9f2c-7e14-4b8a-9c01-2f6d8e4a7b10
# UUID retornado no POST /users
USER_ID=<uuid-do-usuario>
```

| Método   | Rota                                          | Corpo                     | Respostas                                                                 | Exemplo de curl                                                                                                                                                                                       |
| -------- | --------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/users`                                      | `{"name":"Visitante-1234"}` | `201` `{id, name}`; `400` body inválido                                   | `curl -sS -X POST http://localhost:3000/users -H 'Content-Type: application/json' -d '{"name":"Visitante-1234"}'`                                                                                      |
| `GET`    | `/creators`                                   | —                         | `200` `[{id, name}]`                                                      | `curl -sS http://localhost:3000/creators`                                                                                                                                                              |
| `GET`    | `/creators/:creatorId`                        | —                         | `200` `{id, name}`; `404` criadora inexistente; `400` UUID inválido       | `curl -sS http://localhost:3000/creators/$CREATOR_ID`                                                                                                                                                  |
| `POST`   | `/creators/:creatorId/followers`              | `{"userId":"<uuid>"}`     | `201` na primeira vez; `200` se já seguia; `404`; `400`                   | `curl -sS -X POST http://localhost:3000/creators/$CREATOR_ID/followers -H 'Content-Type: application/json' -d "{\"userId\":\"$USER_ID\"}"`                                                            |
| `DELETE` | `/creators/:creatorId/followers/:userId`      | —                         | `204` quando criadora e usuário existem (mesmo sem seguir); `404`; `400`  | `curl -sS -X DELETE http://localhost:3000/creators/$CREATOR_ID/followers/$USER_ID`                                                                                                                     |
| `GET`    | `/creators/:creatorId/followers/count`        | —                         | `200` `{creatorId, count}`; `404`; `400`                                  | `curl -sS http://localhost:3000/creators/$CREATOR_ID/followers/count`                                                                                                                                  |
| `GET`    | `/creators/:creatorId/followers/:userId`      | —                         | `200` `{following}`; `404`; `400`                                         | `curl -sS http://localhost:3000/creators/$CREATOR_ID/followers/$USER_ID`                                                                                                                               |
| `GET`    | `/health`                                     | —                         | `200` `{status, database, uptime, timestamp}`; `503` se o banco não responde | `curl -sS http://localhost:3000/health`                                                                                                                                                                |

O corpo de sucesso de `POST /creators/:creatorId/followers` é
`{creatorId, userId, following: true}`.

Erros são retornados no mesmo envelope JSON:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Creator <uuid> not found",
  "path": "/creators/<uuid>",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

`400` cobre UUID inválido no path, body inválido, campo extra e `name` que não
seja string não vazia. `404` cobre criadora ou usuário inexistente.

## Decisões de design

### Idempotência do follow

A PK composta `(creator_id, user_id)` da tabela `followers` é a fonte de verdade.
A API usa `INSERT ... ON CONFLICT DO NOTHING` (via `.orIgnore()`) com
`RETURNING creator_id`: se uma linha foi inserida, responde `201`; se houve
conflito, responde `200` com `following: true`. Não existe `SELECT` seguido de
`INSERT`, então requisições concorrentes não criam duplicatas. `DELETE` também é
idempotente: com criadora e usuário existentes, responde `204` mesmo que o
vínculo não exista.

### Contador com COUNT(*)

Não existe coluna de contador. `GET /creators/:creatorId/followers/count`
executa `COUNT(*)` na tabela `followers` para a criadora informada. A tabela
`followers` contém apenas `creator_id`, `user_id` e `created_at`.

### Polling de 5 segundos

O frontend atualiza o contador e o estado do botão a cada 5 segundos
(`POLL_INTERVAL_MS = 5000` em `front/src/App.tsx`) e faz uma atualização
imediata após cada ação. O botão fica desabilitado enquanto a requisição está em
andamento, e falhas exibem uma mensagem simples.

### Migrations e seed

As migrations rodam automaticamente na inicialização da API, com
`synchronize: false` e tabela de controle `migrations`. Existem três migrations:

1. `1760000000000-CreateCreatorsUsersFollowers`: cria `creators`, `users` e
   `followers`, com PK composta e FKs `ON DELETE CASCADE`.
2. `1760000000001-SeedCreators`: insere as criadoras fictícias **Lia Monteiro**
   (`5d3a9f2c-7e14-4b8a-9c01-2f6d8e4a7b10`) e **Sofia Andrade**
   (`9b1e6c47-2a85-4d3f-8e6b-7c0a5d2f9e21`) com `ON CONFLICT DO NOTHING`.
3. `1760000000002-AddUuidDefaultsToCreatorsAndUsers`: define
   `gen_random_uuid()` como default dos `id` de `creators` e `users`.

### Validação e formato de erro

Há `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e
`transform`, além de `ParseUUIDPipe` nos parâmetros de rota. Um filtro global
padroniza todos os erros no envelope `{statusCode, error, message, path,
timestamp}`.

### Frontend e proxy

O frontend não usa biblioteca de UI. Ele chama caminhos relativos `/api/...`; em
produção o nginx serve o build do Vite e faz proxy para o serviço `api`,
eliminando CORS. O `userId` fica na chave `seguir-criadora:userId` do
`localStorage`; se o backend responder `404` ou `400` para esse id, o frontend
cria outro usuário e repete a operação.

### Isolamento dos testes

Os testes usam o banco `followers_test` no mesmo container PostgreSQL, criado
pelo `back/test/global-setup.js`. O `back/test/setup-env.ts` força
`DB_NAME = TEST_DB_NAME` antes de carregar o `AppModule`, e o setup recusa nomes
sem o sufixo `_test`.

## Variáveis de ambiente

| Variável        | Uso                                                                 |
| --------------- | ------------------------------------------------------------------- |
| `NODE_ENV`      | Ambiente da aplicação; `api-test` usa `test`                         |
| `API_PORT`      | Porta pública da API no host (padrão `3000`)                        |
| `FRONT_PORT`    | Porta pública do frontend no host (padrão `8080`)                   |
| `POSTGRES_PORT` | Porta pública do PostgreSQL no host (padrão `5432`)                 |
| `DB_HOST`       | Host do banco (`localhost` no exemplo; `postgres` dentro do Compose) |
| `DB_PORT`       | Porta interna do PostgreSQL (`5432`)                                |
| `DB_USER`       | Usuário do PostgreSQL e da aplicação                                |
| `DB_PASSWORD`   | Senha do PostgreSQL; placeholder local no `.env.example`             |
| `DB_NAME`       | Banco de desenvolvimento                                            |
| `TEST_DB_NAME`  | Banco dos testes; precisa terminar em `_test` (padrão `followers_test`) |

## Limitações conhecidas

- **Sem autenticação/autorização.** O `userId` é informado pelo cliente; a API
  não valida identidade nem impede que alguém use o id de outro usuário.
- **Polling em vez de tempo real.** O contador pode ficar até 5 segundos
  desatualizado e cada cliente gera requisições periódicas. Não há WebSocket
  nem SSE.
- **Identidade presa ao navegador.** O `userId` fica no `localStorage`; limpar
  os dados do navegador ou trocar de dispositivo cria um novo visitante.
- **Apenas a primeira criadora é exibida.** Não há seletor, paginação ou busca
  de criadoras.
- **Sem endpoints de escrita de criadoras.** Criadoras vêm apenas da migration
  de seed.
- **Sem rate limiting, HTTPS/TLS ou múltiplas réplicas configuradas.** O Compose
  sobe uma instância de cada serviço e o nginx escuta em HTTP na porta 80
  internamente.
- **Senha de exemplo.** `DB_PASSWORD` no `.env.example` é um placeholder local;
  deve ser trocado fora do ambiente de desenvolvimento.
