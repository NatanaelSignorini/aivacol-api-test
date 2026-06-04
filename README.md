# Aivacol API — Gestão de Frota

Backend NestJS do módulo **Gestão de Frota** da plataforma Aivacol (teste técnico). Expõe CRUD de marcas, modelos e veículos com JWT, cache Redis nas consultas de veículos, documentação OpenAPI e integrações opcionais (RabbitMQ e auditoria em MongoDB).

| Stack | Uso |
|-------|-----|
| NestJS 11 | API REST |
| SQL Server + TypeORM | Persistência e migrations |
| Redis | Cache de listagem/consulta de veículos |
| JWT | Todas as rotas protegidas, exceto login |
| Swagger | UI em `/api/docs` (configurável) |

**Gerenciador de pacotes:** [Yarn](https://yarnpkg.com/)

---

## Pré-requisitos

- **Node.js** 18 ou superior
- **Yarn** 1.x ou Berry
- **Docker** e **Docker Compose** (recomendado para subir SQL Server, Redis e stack completa)

---

## Configuração rápida

```bash
cp .env.example .env
yarn install
```

Ajuste `JWT_SECRET` (mínimo 32 caracteres) e `DB_PASSWORD` se necessário. O arquivo `.env.example` descreve cada variável e os fluxos Docker.

### Usuário padrão (seed)

Após `yarn seed` (ou no entrypoint do Docker), use:

| Campo | Valor |
|-------|--------|
| E-mail | `admin@aivacol.com` |
| Senha | `Aivacol123!` |
| Nickname | `aivacol` |
| Papel | Admin |

O seed também carrega dados de demonstração de `src/database/seed-data/fleet.seed.json` (marcas, modelos e veículos).

---

## Executar a API

### Opção A — Stack completa no Docker (recomendado para avaliação)

Sobe API, SQL Server, Redis, RabbitMQ e MongoDB. Migrations e seed rodam automaticamente no entrypoint.

```bash
docker compose -f docker-compose.yml up --build api
```

O Compose sobe **todos** os serviços que a API depende (SQL Server, Redis, RabbitMQ, MongoDB), mas o terminal mostra **só os logs da API** — incluindo entrypoint, migrations e seed.

Atalho opcional: `yarn docker:up` (mesmo comando). Para parar: `yarn docker:down` ou `docker compose -f docker-compose.yml down`.

Logs só do MongoDB (outro terminal): `docker compose -f docker-compose.yml logs -f mongodb`.

- API: `http://localhost:4000` (porta definida em `PORT`)
- Prefixo REST: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api/docs` (ou valor de `SWAGGER_PATH`)
- RabbitMQ Management: `http://localhost:15672` (guest / guest)

Com a stack completa, o `.env` padrão usa `RABBITMQ_ENABLED=true` e `MONGODB_ENABLED=true` (hostnames `rabbitmq` e `mongodb` na rede Docker).

### Opção B — Infra no Docker, API no host

Útil para desenvolvimento com hot reload. No `.env`, use `DB_HOST=localhost`, `REDIS_HOST=localhost` e desative RabbitMQ/MongoDB (`RABBITMQ_ENABLED=false`, `MONGODB_ENABLED=false`).

```bash
docker compose up sqlserver redis -d
yarn db:create
yarn migration:run
yarn seed
yarn start:dev
```

Para testes de integração, use o mesmo par `sqlserver` + `redis` e execute `yarn test:integration`.

### Produção local

```bash
yarn build
yarn start:prod
```

### SQL Server com falha ao subir

```bash
docker compose -f docker-compose.yml down -v
docker compose -f docker-compose.yml up --build api
```

---

## Swagger (OpenAPI)

1. Com a API rodando, abra `http://localhost:4000/api/docs` (ajuste host/porta conforme `.env`).
2. Em **Auth**, execute `POST /auth/login` com o corpo:

   ```json
   {
     "email": "admin@aivacol.com",
     "password": "Aivacol123!"
   }
   ```

3. Copie `accessToken` da resposta.
4. Clique em **Authorize**, informe `Bearer <accessToken>` (o UI adiciona o prefixo se necessário).
5. Teste os endpoints protegidos (`Brands`, `Models`, `Vehicles`, `Users`).

O documento OpenAPI JSON fica em `/{SWAGGER_PATH}-json` (ex.: `/api/docs-json`).

---

## Testes automatizados

| Comando | Escopo |
|---------|--------|
| `yarn test:unit` | Regras de negócio, services, DTOs (`src/**/*.spec.ts`) |
| `yarn test:e2e` | HTTP com mocks, sem Docker |
| `yarn test` | Unitários + e2e |
| `yarn test:integration` | `AppModule` real com SQL Server e Redis |
| `yarn test:cov` | Cobertura (projeto unit) |
| `yarn check` | Biome (lint + format) |
| `yarn check:fix` | Corrige formatação/lint quando possível |

**Integração:** exige infra rodando:

```bash
docker compose up sqlserver redis -d
yarn test:integration
```

Se SQL Server ou Redis não estiverem acessíveis, a suíte de integração é ignorada (exit 0) para não quebrar `yarn test` em ambientes sem Docker.

Antes de entregar alterações:

```bash
yarn check:fix
yarn test
```

---

## Scripts úteis

| Script | Descrição |
|--------|-----------|
| `yarn start` / `yarn start:dev` | API (valida `.env` antes) |
| `yarn migration:run` | Aplica migrations TypeORM |
| `yarn migration:revert` | Reverte última migration |
| `yarn seed` | Usuário admin + frota mock |
| `yarn docker:up` / `yarn docker:down` | Atalhos para `docker compose -f docker-compose.yml up --build api` e `down` |

---

## Recursos da API

Prefixo global: `API_PREFIX` (padrão `api/v1`).

| Módulo | Rotas (exemplos) |
|--------|------------------|
| Auth | `POST /auth/login` (público), `POST /auth/logout` |
| Brands | CRUD `/brands` |
| Models | CRUD `/models` |
| Vehicles | CRUD `/vehicles` (cache Redis em GET list/id) |
| Users | CRUD `/users` (admin) |

Respostas de erro seguem envelope padronizado (`HttpExceptionFilter`).

---

## Estrutura do repositório

```
src/modules/     # Domínio (auth, brands, models, vehicles, users, …)
src/database/    # Migrations, seeds, mock JSON
test/e2e/        # Testes e2e com mocks
test/integration/# Testes com SQL Server + Redis
docker-compose.yml
```

Guia detalhado para agentes e convenções de implementação: [`AGENTS.md`](./AGENTS.md).

---

## Licença

Projeto privado (`UNLICENSED`).
