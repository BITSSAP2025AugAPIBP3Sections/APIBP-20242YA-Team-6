# Events Service

Status: Scaffold only (no business logic yet).

## Planned Responsibilities
Event creation, updates, scheduling metadata, categorization, public discovery.

## Current State
No implementation yet – choose a tech stack (Node / Python / Java).

## Port
Reserved: `8002` (override with `PORT`).

## Required Contract
`GET /health` => `{ "status": "ok", "service": "events" }`

## Getting Started
Select a stack and add a minimal health endpoint + Dockerfile. See `docs/services/CONVENTIONS.md` and copy from another service.

## Future Checklist
| Feature | Status |
|---------|--------|
| Stack chosen | ☐ |
| Health endpoint | ☐ |
| Event CRUD models | ☐ |
| Persistence + migrations | ☐ |
| Search / filtering strategy | ☐ |
| Readiness probe | ☐ |
| OpenAPI / GraphQL schema | ☐ |
| Event bus publishing | ☐ |
| Caching layer | ☐ |
| Observability | ☐ |

---
Keep scope minimal until architecture decisions are finalized.
