# Handoff

## Current state
- Stack: Go API + React/Vite frontend with Postgres, Redis, HiveMQ (MQTT), n8n, and Nginx via Docker Compose.
- Backend connects to Postgres, starts MQTT processing, serves Roboflow proxy and random frame endpoints, and caches recent readings in Redis.
- Frontend has a Control Hub landing page with Dashboard and Simulator pages; Dashboard reads MQTT, renders Recharts, and calls the backend for Roboflow inference + random frames.

## Completed work
- README updated to reflect the full stack, ports, env vars, Supabase toggle, and n8n notes. See [README.md](README.md).
- Redis service added to Docker Compose with a named volume. See [docker-compose.yml](docker-compose.yml).
- Redis/MQTT/Roboflow env placeholders added to env templates. See [.env.example](.env.example).
- Backend Redis cache for `/readings/:machine_id` and Roboflow endpoints are in [services/backend/cmd/main.go](services/backend/cmd/main.go).
- Postgres connection uses POSTGRES_* envs via [services/backend/db/db.go](services/backend/db/db.go).
- Frontend Dashboard MQTT + Roboflow UI lives in [services/frontend/src/pages/Dashboard.tsx](services/frontend/src/pages/Dashboard.tsx).
- MQTT Simulator page lives in [services/frontend/src/pages/Simulator.tsx](services/frontend/src/pages/Simulator.tsx).
- Proxying for `/api` and `/assets/roboflow` is set in [services/frontend/nginx.conf](services/frontend/nginx.conf) and [docker/nginx/nginx.conf](docker/nginx/nginx.conf).
- Roboflow image folders contain ok/defect samples under assets/roboflow (see [assets/roboflow/ok/.gitkeep](assets/roboflow/ok/.gitkeep) and [assets/roboflow/defect/.gitkeep](assets/roboflow/defect/.gitkeep)).

## In progress / pending
- Image refresh is not yet tied to MQTT publish interval. Dashboard only refetches frames when `activeLevel` or `activeMachineId` changes. Update logic in [services/frontend/src/pages/Dashboard.tsx](services/frontend/src/pages/Dashboard.tsx).
- Monitor image sizing still needs “fit card height” tuning. Styles are in [services/frontend/src/App.css](services/frontend/src/App.css).
- User asked “how do I use Redis fully?” but no guidance/docs were added yet.

## Open issues / risks
- Supabase toggle exists in env/config but is not wired to data access. The backend always connects to Postgres. Config scaffold is in [services/backend/internal/config/config.go](services/backend/internal/config/config.go).
- Secrets are stored in [.env](.env); keep it out of git (already ignored by [.gitignore](.gitignore)). Do not copy keys into frontend code.

## Suggested next steps
1. Decide how to refresh frames on MQTT ticks (e.g., add a timer or trigger on new readings) and update [services/frontend/src/pages/Dashboard.tsx](services/frontend/src/pages/Dashboard.tsx).
2. Adjust `.monitor-frame` sizing to fit the card height and update [services/frontend/src/App.css](services/frontend/src/App.css).
3. If Supabase is needed, implement a Supabase data layer and switch based on `USE_SUPABASE`, using [services/backend/internal/config/config.go](services/backend/internal/config/config.go).
4. Add Redis usage guidance to README and confirm env vars in [README.md](README.md) and [.env.example](.env.example).

## Key files
- [docker-compose.yml](docker-compose.yml)
- [.env.example](.env.example)
- [.env](.env)
- [services/backend/cmd/main.go](services/backend/cmd/main.go)
- [services/backend/db/db.go](services/backend/db/db.go)
- [services/backend/internal/config/config.go](services/backend/internal/config/config.go)
- [services/frontend/src/pages/Dashboard.tsx](services/frontend/src/pages/Dashboard.tsx)
- [services/frontend/src/pages/Simulator.tsx](services/frontend/src/pages/Simulator.tsx)
- [services/frontend/src/App.css](services/frontend/src/App.css)
- [services/frontend/vite.config.ts](services/frontend/vite.config.ts)
