# Events Service

Status: Scaffold only (no business logic yet).

## Planned Responsibilities
Event creation, updates, scheduling metadata, categorization, public discovery.

## Current State
- Tech stack: Node.js + Express
- Implemented endpoints:
  - `GET /health` -> `{ "status": "ok", "service": "events" }`
  - `GET /ready` -> `{ "ready": true }`
  - `GET /api/events/ping` -> `{ "pong": true }`
- No persistence, messaging, or external integrations.

## Port
Default internal port: `8002` (overridable via `PORT`). Ensure this matches docker-compose.

## Local Development
1. Install deps: `npm install` (from repo root: `npm install -w services/events`)
2. Dev run: `npm run dev -w services/events`
3. Health check: `curl http://localhost:8002/health`

## Docker
```bash
# build (from repo root)
docker build -t events-service:dev services/events
# run
docker run -p 8002:8002 --env PORT=8002 events-service:dev
```

## Future Checklist
| Feature | Status |
|---------|--------|
| Stack chosen | ✅ |
| Health endpoint | ✅ |
| Event CRUD models | ☐ |
| Persistence + migrations | ☐ |
| Search / filtering strategy | ☐ |
| Readiness probe | ✅ |
| OpenAPI / GraphQL schema | ☐ |
| Event bus publishing | ☐ |
| Caching layer | ☐ |
| Observability | ☐ |

---
Keep scope minimal until architecture decisions are finalized.
