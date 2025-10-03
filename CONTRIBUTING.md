# Contributing Guide

Welcome! This monorepo is intentionally polyglot: each service may use **Node.js**, **Python (FastAPI)**, **Java (Spring Boot)**, or another suitable stack. Keep contributions minimal and infrastructure‑focused until domain logic is formally defined.

---
## Ground Rules
1. Respect the service boundaries – no cross-service imports of runtime code (shared DTOs / schemas will live under `libs/`).
2. Every running unit must provide a stable `GET /health` endpoint returning:
   ```json
   { "status": "ok", "service": "<name>" }
   ```
3. No business logic until an ADR (Architecture Decision Record) exists for it (place ADRs in `docs/adr/`).
4. Prefer **backward-compatible** changes; if not possible, open a proposal issue first.
5. Keep diffs small, focused, and reviewed by at least one other teammate.

---
## Project Layout Overview
```
gateway/                 # API gateway (GraphQL + REST shell)
services/<domain>/       # Individual microservices (language-agnostic)
libs/                    # Shared libraries (DTOs, schemas, constants)
docs/                    # Architecture, service conventions, ADRs
Makefile / Taskfile.yml  # Unified tooling entrypoints
docker-compose.yml       # Local orchestration (infra + services)
```

Key documents:
- `docs/services/CONVENTIONS.md` – service contract & skeletons.
- `DEVELOPMENT.md` – environment & workflow instructions.

---
## Branching & Release Flow
We keep `main` stable (builds & health endpoints must pass).

Suggested lightweight model:
| Branch | Purpose |
|--------|---------|
| `main` | Always green; deployable reference |
| `feat/<topic>` | New feature or scaffold work |
| `fix/<issue>` | Bug / repair change |
| `chore/<task>` | Tooling / housekeeping |

Delete merged branches promptly.

---
## Commit Messages (Conventional Commits)
Format: `type(scope): short summary`

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`.

Examples:
```
feat(auth): scaffold FastAPI service shell
docs: add service conventions for readiness probes
fix(gateway): correct readiness flag transition timing
```

---
## Issues & PRs
1. Open an issue for anything non-trivial (scaffolding, architecture changes, dependency strategy).
2. Reference issues in PR body: `Closes #NN`.
3. PR checklist:
   - [ ] Build passes (`make build` or gateway compile if only TS)
   - [ ] Health endpoint unaffected (or updated docs)
   - [ ] Added / updated README or docs if behavior changed
   - [ ] No stray debug logs / secrets

---
## Adding a New Service (High-Level)
1. `make new-service SERVICE=events-search` (or manually create folder).
2. Choose stack (Node / Python / Java).
3. Implement only `/health`.
4. Add `Dockerfile` exposing chosen port (update `docker-compose.yml`).
5. Add minimal `README.md` & update checklist inside it.
6. (Optional) Add readiness endpoint `/ready` returning 503 until server fully started.
7. Submit PR.

Detail steps per language are in `DEVELOPMENT.md`.

---
## Code Style & Quality
| Aspect | Standard (initial) |
|--------|--------------------|
| TypeScript | Strict TS (`tsconfig.base.json`) |
| Python | Black (line length 100) & Ruff (future) |
| Java | Google style or Spring defaults |
| Logging | JSON single-line (structured) where possible |
| Errors | Never swallow; log with context + request correlation id |

Introduce linters formatter config incrementally; avoid huge formatting PRs.

---
## Shared Artifacts / DTOs
Store cross-service DTOs or schema contracts in `libs/` (language-specific implementations may mirror types). Avoid importing live runtime code across services – use serialized contracts (JSON Schema, OpenAPI, GraphQL SDL) or generated code from those definitions.

---
## Testing Philosophy (Early Phase)
Minimum expectation:
* Gateway: one smoke test (`/health`) & GraphQL health query.
* Each service: liveness test.

Add contract tests only after first business use-case is defined.

---
## Security & Secrets
* Do not commit real secrets.
* Use `.env.example` for placeholders.
* Avoid embedding tokens in code comments or docs.

---
## Performance / Observability (Future)
Stage 1: Basic structured logs.
Stage 2: Add metrics endpoint or sidecar.
Stage 3: Distributed tracing (OpenTelemetry) once inter-service calls begin.

---
## ADRs (Architecture Decision Records)
When making a directional choice (e.g., event bus technology, auth strategy), create `docs/adr/NNN-title.md` using a short template:
```
# NNN Title
Date:
Status: Proposed | Accepted | Deprecated
Context:
Decision:
Consequences:
```

---
## Review Guidelines
Reviewer checklist:
* Clear scope?
* No unrelated drive-by refactors?
* Follows service conventions?
* Health/readiness unaffected or updated?
* Dependencies reasonable & minimal?
* No binary / large artifacts committed?

---
## Dependency Management
* Node: add only to the service or gateway `package.json` consuming it.
* Python: use `pyproject.toml` (Poetry / PDM) or `requirements.txt` – do not vendor wheels.
* Java: prefer Maven (simpler) unless Gradle needed for performance.
* Keep infra libs small; avoid premature optimization.

---
## Release Tags (Later Phase)
When we introduce versioning, tag stable milestones (`v0.x.y`). No tags until business logic emerges.

---
## Communication
Questions or uncertainty? Open an issue titled `RFC:` or drop a short doc under `docs/rfc/` for async feedback.

---
Happy building! Keep it lean, explicit, and documented.
