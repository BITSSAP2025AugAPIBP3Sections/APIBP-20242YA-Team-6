# Auth Service

Status: Scaffold only (no business logic yet).

## Purpose (Planned)
Authentication, authorization, role issuance, session/token management.

## Current State
- Tech stack placeholder: Node.js + TypeScript (can be replaced with Python / Java).
- Implemented endpoints:
  - `GET /health` -> `{ "status": "ok", "service": "auth" }`
- No persistence, messaging, or external integrations.

## Port
Default internal port: `8001` (overridable via `PORT`). Ensure this matches docker-compose.

## Local Development (Node scaffold)
If keeping Node version:
1. Install deps: `npm install` (from repo root: `npm install -w services/auth`)
2. Dev run: `npm run dev -w services/auth`
3. Health check: `curl http://localhost:8001/health`

If replacing with another stack, update this section accordingly.

## Docker
```
# build (from repo root)
docker build -t auth-service:dev services/auth
# run
docker run -p 8001:8001 --env PORT=8001 auth-service:dev
```

## Environment Variables (Baseline)
| Variable | Required | Notes |
|----------|----------|-------|
| PORT | No | Overrides default 8001 |

## Migration / Future TODOs
| Item | Status |
|------|--------|
| Choose final stack (Node/Python/Java) | ☐ |
| Add OpenAPI / GraphQL schema | ☐ |
| Implement auth flows (signup/login) | ☐ |
| Token / session strategy | ☐ |
| RBAC model definition | ☐ |
| Persistence layer + migrations | ☐ |
| Observability (logs/metrics/tracing) | ☐ |
| Readiness probe (`/ready`) | ☐ |
| NATS / event bus integration | ☐ |

## Conventions
Follow shared guidelines in `docs/services/CONVENTIONS.md`.

## Replacing the Implementation
If you switch stacks:
1. Remove current `package.json`, `tsconfig.json`, `src/`.
2. Add new language scaffold (e.g. `pyproject.toml` or `pom.xml`).
3. Keep the `/health` contract identical.
4. Keep Dockerfile name `Dockerfile` exposing same port.

---
Maintainers: update checklist as milestones are completed.
