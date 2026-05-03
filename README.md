# Bebas QC

Full-stack app with a Go API, a React/Vite frontend, Postgres, Redis, HiveMQ (MQTT), n8n, and Nginx.

## Prerequisites

- Go (see version in [services/backend/go.mod](services/backend/go.mod))
- Node.js 20.x and npm
- Docker + Docker Compose (for containerized workflow)

## Environment

1. Copy [.env.example](.env.example) to `.env`.
2. Fill in values:
	- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
	- `POSTGRES_HOST` (use `postgres` for Docker, `localhost` for local)
	- `POSTGRES_PORT` (default `5432`)
	- `BACKEND_PORT` (default `8080`)
	- `USE_SUPABASE` (`true` or `false`)
	- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Database provider toggle

Set `USE_SUPABASE=true` to switch to Supabase config. When `USE_SUPABASE=false`, the backend uses Postgres config. Both can exist in `.env` and you can flip the flag as needed.

### Supabase setup (optional)

1. Create a project in Supabase.
2. In **Project Settings -> API**, copy the **Project URL** and keys.
3. Set `SUPABASE_URL` to the base URL (no `/rest/v1` suffix).
4. Use the anon key in frontend apps; use the service role key only on the backend.

### Postgres notes

`POSTGRES_DB` is created on first container init. If you change it later, recreate the volume:

```sh
docker compose down -v
docker compose up --build
```

## Local development

Backend (Go):

```sh
cd services/backend
go mod download
go run ./cmd/main.go
```

Frontend (Vite):

```sh
cd services/frontend
npm install
npm run dev
```

## Docker (full stack)

```sh
docker compose up --build
```

Endpoints:

- App: http://localhost
- API (via Nginx): http://localhost/api/
- Direct API: http://localhost:8080
- Redis: localhost:6379
- HiveMQ MQTT: tcp://localhost:1883
- HiveMQ WebSocket: ws://localhost:8000/mqtt
- HiveMQ UI: http://localhost:8090
- n8n: http://localhost:5678

## Ports

- 80: Nginx reverse proxy
- 3000: Frontend container (Nginx serving the built app)
- 8080: Backend API
- 5432: Postgres
- 6379: Redis
- 1883: HiveMQ MQTT
- 8000: HiveMQ WebSocket
- 8090: HiveMQ UI
- 5678: n8n

## n8n notes

The n8n container uses basic auth credentials from docker-compose. Change them before sharing publicly.

## Docker configuration

- [docker-compose.yml](docker-compose.yml)
- [docker/nginx/nginx.conf](docker/nginx/nginx.conf) (routes `/` to frontend, `/api/` to backend)
- [docker/hivemq/config/config.xml](docker/hivemq/config/config.xml) (MQTT + WebSocket listeners)
- [services/frontend/nginx.conf](services/frontend/nginx.conf) (SPA routing + `/api/` proxy)
- [services/backend/Dockerfile](services/backend/Dockerfile)
- [services/frontend/Dockerfile](services/frontend/Dockerfile)
