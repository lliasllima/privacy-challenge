# PROMPTS.md

Registro dos prompts usados no desenvolvimento do projeto **Seguir Criadora**. Os textos foram copiados do histórico da sessão, sem reescrita.

## Prompt 1

**Ferramenta:** OpenCode

**Texto do prompt:**

```text
Estou construindo o projeto "Seguir criadora" num monorepo com duas pastas: /back (NestJS + TypeScript) e /front (React, será feito depois), e um docker-compose.yml na raiz. Neste passo quero APENAS a base de infraestrutura, sem endpoints de negócio. Não faça perguntas: se faltar informação, decida e liste as decisões no final. Não faça commit.

Entregue:
1. /back com NestJS, TypeORM e PostgreSQL 16, configuração por variáveis de ambiente (@nestjs/config), ValidationPipe global (whitelist + forbidNonWhitelisted) e GET /health.
2. Tabelas via MIGRATIONS do TypeORM (synchronize=false, migrations rodando automaticamente quando a API sobe):
   - creators (id uuid PK, name, created_at)
   - users (id uuid PK, name, created_at)
   - followers (creator_id FK, user_id FK, created_at, PK composta (creator_id, user_id), ON DELETE CASCADE)
3. Seed via migration com 2 criadoras com UUIDs fixos e nomes fictícios.
4. back/Dockerfile simples e docker-compose.yml na raiz com serviço postgres (com healthcheck e volume nomeado) e serviço api (depends_on com condition service_healthy), API na porta 3000.
5. .env.example com todas as variáveis; .env no .gitignore; NENHUM segredo ou senha hardcoded no código ou no compose (o compose lê do .env). Crie também .gitignore e .dockerignore.

Critério de aceite: `cp .env.example .env && docker compose up --build` sobe tudo; GET /health responde 200; as tabelas existem e as 2 criadoras estão no banco. Execute esses comandos e mostre a saída como prova.
```

**Por que este prompt:** eu queria resolver primeiro a base do projeto — NestJS, TypeORM, migrations, seed, Docker e variáveis de ambiente — antes de escrever qualquer endpoint de negócio.

**O que a IA entregou:** backend NestJS 11 com TypeORM e PostgreSQL 16, `ValidationPipe` global e `GET /health`; migrations de criação das tabelas e seed com duas criadoras; `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore` e `.dockerignore`.

**O que estava errado ou faltando, e o que você fez:** nada funcional faltou nesta etapa. O único ajuste operacional foi subir com `docker compose up --build -d` para conseguir executar as verificações seguintes; o build e os serviços eram os mesmos do critério de aceite.

**Como você conferiu:** rodei `cp .env.example .env`, `docker compose up --build -d` e `docker compose ps`; a API e o Postgres ficaram `healthy`, nas portas 3000 e 5432. `curl` em `/health` retornou 200, o banco tinha as tabelas `creators`, `users`, `followers` e `migrations`, e o seed tinha exatamente Lia Monteiro e Sofia Andrade. Também reiniciei a API e confirmei que o seed não duplicou; `git check-ignore -v .env` confirmou o `.env` ignorado.

## Prompt 2

**Ferramenta:** OpenCode

**Texto do prompt:**

```text
Continuando o projeto no estado atual do repositório. Implemente a API de negócio em /back. Não faça perguntas: decida e liste as decisões no final. Não faça commit.

Endpoints (sem prefixo /api):
- POST /users  body {name} -> 201 {id, name}
- GET /creators -> lista de {id, name}
- GET /creators/:creatorId -> {id, name}; 404 se não existir
- POST /creators/:creatorId/followers  body {userId} -> 201 na primeira vez, 200 se já seguia (idempotente); corpo {creatorId, userId, following: true}
- DELETE /creators/:creatorId/followers/:userId -> 204 sempre que criadora e usuário existirem (idempotente, mesmo se não seguia)
- GET /creators/:creatorId/followers/count -> {creatorId, count}
- GET /creators/:creatorId/followers/:userId -> {following: boolean}

Regras:
- 404 se a criadora ou o usuário não existirem; 400 para UUID inválido ou body inválido (ParseUUIDPipe e class-validator).
- count DEVE ser COUNT(*) na tabela followers. Proibido criar coluna de contador.
- O seguir duplicado deve ser resolvido pela PK composta (INSERT ... ON CONFLICT DO NOTHING ou tratamento do erro 23505), nunca por "select e depois insert", para ser seguro sob concorrência.
- Organize em módulos (users, creators, followers), com DTOs, service e controller separados, usando TypeORM.
- Erros em formato JSON consistente.

Critério de aceite: suba com docker compose e teste cada endpoint com curl, incluindo: seguir duas vezes, deixar de seguir sem seguir, criadora inexistente, UUID inválido. Mostre os comandos e as respostas.
```

**Por que este prompt:** eu precisava implementar o fluxo principal da aplicação e garantir dois pontos delicados: idempotência do follow/unfollow e segurança sob concorrência, sem usar uma coluna de contador.

**O que a IA entregou:** módulos `users`, `creators` e `followers` com DTOs, services e controllers; filtro global de erros em JSON; `COUNT(*)` para o contador; follow idempotente via `INSERT ... ON CONFLICT DO NOTHING`; migration adicional para os defaults de UUID.

**O que estava errado ou faltando, e o que você fez:** o primeiro `POST /users` retornou 500 porque as migrations criaram `id uuid` sem default e o TypeORM inseria `DEFAULT`. Criei a migration `1760000000002-AddUuidDefaultsToCreatorsAndUsers`, aplicando `gen_random_uuid()` em `creators` e `users`, e repeti os testes.

**Como você conferiu:** subi a API no Compose e testei com `curl`: `POST /users` → 201; `GET /creators` → 200 com as duas criadoras; seguir duas vezes → 201 e depois 200, com `count` = 1; `DELETE` duas vezes, inclusive sem seguir → 204 nas duas; criadora inexistente → 404; UUID inválido → 400. Disparei 10 `POST`s simultâneos do mesmo par: houve um 201, nove 200 e `count` continuou 1. Também inspecionei `followers` e confirmei que a tabela tem apenas `creator_id`, `user_id` e `created_at`, sem coluna de contador.

## Prompt 3

**Ferramenta:** OpenCode

**Texto do prompt:**

```text
Continuando o projeto. Crie os testes automatizados da API. Não faça perguntas: decida e liste as decisões no final. Não faça commit.

Requisitos:
- Jest + supertest, testes e2e rodando contra PostgreSQL REAL (nada de mock de banco nem SQLite).
- Use um banco separado (ex.: followers_test) no mesmo container do postgres, para que os testes NUNCA toquem no banco de desenvolvimento. Limpe followers/users entre os casos.
- Tudo rodando por UM comando via Docker (ex.: `docker compose run --rm api-test` ou profile "test").
- Casos obrigatórios: criar usuário (ok e body inválido); listar/buscar criadora (ok e 404); seguir (201), seguir de novo (200 sem duplicar); count correto após seguir e deixar de seguir; deixar de seguir sem seguir (204); criadora e usuário inexistentes (404); UUID inválido (400); e um teste de CONCORRÊNCIA: 10 POSTs simultâneos do mesmo usuário via Promise.all resultam em count = 1 e nenhum erro 500.
- Se algum teste falhar, diga se o bug está no código ou no teste, corrija e rode de novo.

Critério de aceite: o comando de testes passa do zero (rode `docker compose down -v` antes). Mostre a saída completa.
```

**Por que este prompt:** eu queria uma suíte e2e confiável contra PostgreSQL real, incluindo o caso de concorrência, e um comando único via Docker que não tocasse no banco de desenvolvimento.

**O que a IA entregou:** 12 casos e2e com Jest e supertest; banco separado `followers_test` criado pelo `global-setup`; guarda que recusa bancos sem sufixo `_test`; `setup-env.ts` para forçar o banco de teste; serviço `api-test` no profile `test` do Compose; estágio `test` no Dockerfile.

**O que estava errado ou faltando, e o que você fez:** o caso `POST /users` com `{name: 123}` retornava 201 em vez de 400. O problema estava no código: `enableImplicitConversion` convertia o número para string antes do `@IsString()`. Removi a conversão implícita, mantive `transform: true` para o `@Transform` de trim e restringi o `transform` do ts-jest a `^.+\.ts$`, eliminando também o warning do `global-setup.js`.

**Como você conferiu:** rodei `docker compose down -v` e depois `docker compose run --rm --build api-test`. Resultado: `Test Suites: 1 passed`, `Tests: 12 passed`, incluindo o teste de concorrência com 10 `POST`s simultâneos e nenhum 500. Também consultei os bancos: `followers_test` com as tabelas e o banco de desenvolvimento `seguir_criadora` com `public_tables = 0`, comprovando o isolamento.

## Prompt 4

**Ferramenta:** OpenCode

**Texto do prompt:**

```text
Continuando o projeto. Crie o frontend em /front com React + TypeScript + Vite e integre ao docker-compose. Não faça perguntas: decida e liste as decisões no final. Não faça commit.

Tela única:
- Nome da criadora (a primeira de GET /creators), número de seguidores e um botão "Seguir" / "Deixar de seguir".
- Usuário: na primeira visita, crie um usuário via POST /users (nome gerado, ex.: "Visitante-xxxx") e guarde o userId no localStorage. Se o userId guardado deixar de existir no backend (404, ex.: banco recriado), crie outro automaticamente em vez de quebrar.
- Ao carregar, consulte GET .../followers/:userId para mostrar o estado correto do botão.
- O contador atualiza por polling a cada 5 segundos e imediatamente após clicar.
- Mensagem simples de erro se a API falhar e botão desabilitado durante a requisição.
- Sem bibliotecas de UI; CSS simples.

Infra:
- front/Dockerfile (build do Vite + nginx servindo o estático) e novo serviço no docker-compose, em http://localhost:8080.
- nginx faz proxy de /api/ para a api (removendo o prefixo), evitando CORS. O front chama sempre /api/....
- Nenhum segredo no código.

Critério de aceite: `docker compose up --build` sobe postgres, api e front; em http://localhost:8080 seguir e deixar de seguir funciona e o contador muda. Verifique com curl que o proxy /api funciona e mostre as saídas.
```

**Por que este prompt:** eu queria fechar o fluxo do usuário no navegador, com uma tela única, polling do contador e integração do front ao Compose através do proxy do nginx.

**O que a IA entregou:** frontend React 19 + TypeScript + Vite 6 com CSS puro; criação automática de usuário visitante e `userId` no `localStorage`; polling de 5 segundos; recuperação de `userId` inexistente; `front/Dockerfile` multi-stage com nginx e serviço `front` em `http://localhost:8080`.

**O que estava errado ou faltando, e o que você fez:** o primeiro script de verificação do proxy falhou porque eu tentava ler `id` de um array; era erro do script, não da aplicação. Corrigi o parser e repeti. Depois completei a validação do polling e do `userId` inválido no navegador.

**Como você conferiu:** rodei `docker compose down -v` e `docker compose up --build -d`; `curl` em `http://localhost:8080/` retornou 200 pelo nginx. Pelo proxy, `GET /api/creators` e `GET /api/health` retornaram 200; o fluxo completo via `/api` deu 201 no primeiro follow, 200 no segundo, 204 no unfollow e o contador variou de 0 para 1 e voltou para 0. No navegador, validei a tela, o polling de 5 s, a recuperação de `userId` inválido e o botão desabilitado durante a requisição. Os testes e2e do backend continuaram passando: 12/12.

## Prompt 5

**Ferramenta:** OpenCode

**Texto do prompt:**

```text
Continuando o projeto. Este é o passo final. NÃO adicione funcionalidades novas e NÃO altere código de negócio. NÃO suba containers nem rode testes: o fluxo já foi validado por mim. Não faça perguntas: decida e liste as decisões no final. Não faça commit.

1. Revise o repositório inteiro procurando segredos ou senhas hardcoded (código, docker-compose.yml, Dockerfiles, nginx.conf, migrations) e confirme que .env está no .gitignore e que só o .env.example existe. Se achar algo, corrija e diga exatamente o que mudou. Se não achar nada, diga isso explicitamente.
2. Escreva o README.md na raiz, em português, com: visão geral, stack, como subir, como rodar os testes, tabela de endpoints (método, rota, corpo, códigos de resposta e exemplo de curl), decisões de design (idempotência, COUNT(*), polling de 5s, migrations e seed) e limitações conhecidas (sem autenticação, polling em vez de tempo real).

Regra para o README: todo comando, porta, nome de serviço, nome de script e variável de ambiente citado deve ser copiado dos arquivos reais do repositório (docker-compose.yml, package.json, .env.example, controllers). Não invente nem suponha nada. Se algo não puder ser confirmado nos arquivos, escreva "não verificado" no lugar.

Critério de aceite: liste, no final, cada comando do README e o arquivo de onde você o tirou.
```

**Por que este prompt:** eu queria uma revisão final de segurança e um README que servisse como documentação confiável do projeto, sem inventar comandos, portas ou variáveis.

**O que a IA entregou:** auditoria de segredos sem achados reais; README em português com visão geral, stack, subida, testes, tabela de endpoints, decisões de design e limitações; lista final relacionando cada comando do README ao arquivo de origem.

**O que estava errado ou faltando, e o que você fez:** nenhum segredo foi encontrado, então nada foi corrigido em código ou configuração. No README, o comando de teste ainda estava sem `--profile test`; ajustei para `docker compose --profile test run --rm --build api-test`, porque o serviço `api-test` declara `profiles: ["test"]`. Também deixei explícito que existe um `.env` local, mas ele é ignorado e apenas o `.env.example` é versionado.

**Como você conferiu:** rodei uma busca por senhas, tokens, chaves e credenciais em todo o repositório (incluindo `package-lock.json`); os únicos resultados foram leituras de `process.env.DB_PASSWORD`, o placeholder local do `.env.example` e a dependência `@inquirer/password`, que é apenas um nome de pacote. `git check-ignore -v .env` apontou `.gitignore:69`, e `git ls-files` listou apenas `.env.example` entre os arquivos de ambiente. Ao final, `git status --short` mostrava apenas `M README.md`. Não subi containers nem rodei testes, conforme instruído.

## Decisões que tomei

- O enunciado não detalhava as regras de negócio do seguidor. Decidi que qualquer visitante pode seguir sem cadastro ou login: o frontend cria um usuário automaticamente e guarda o `userId` no `localStorage`.
- Decidi exibir apenas a primeira criadora retornada por `GET /creators`, sem seletor, paginação ou busca.
- Follow e unfollow são idempotentes: o primeiro follow responde 201, um follow repetido responde 200 e o unfollow responde 204 mesmo quando o vínculo não existe.
- O contador é sempre calculado com `COUNT(*)`; não criei coluna de contador.
- A atualização da tela é por polling de 5 segundos, com atualização imediata após o clique; não implementei WebSocket nem SSE.
- O cadastro/gestão de criadoras ficou fora do escopo; as criadoras vêm apenas da migration de seed.
- Os testes usam um banco separado (`followers_test`) com guarda de sufixo `_test`, para não tocar no banco de desenvolvimento.
- Registrei a ferramenta real usada nesta sessão (OpenCode com DeepSeek V4.1 Flash Free), e não “Claude Code” do modelo do enunciado. O Prompt 1 aparecia duplicado no histórico e foi consolidado em uma única seção; o pedido atual de criação deste `PROMPTS.md` não foi incluído como uma etapa do projeto.

## O que não verifiquei

- Não verifiquei cadastro ou gestão de uma influenciadora; optei por deixar o fluxo mais simples e usar apenas as criadoras do seed.
- Não verifiquei autenticação/autorização real: não existe login e o `userId` é informado pelo cliente.
- Não verifiquei HTTPS/TLS, rate limiting, múltiplas réplicas ou deploy em produção.
- Não verifiquei a interface em outros navegadores ou dispositivos além do navegador usado na validação.
