# Tasks Service

Status: Scaffold only (no business logic yet).

## Planned Responsibilities
Task/deliverable definitions, status transitions, timelines, dependency tracking.

## Current State
Empty – ready for implementation.

## Port
Reserved: `8004`.

## Contract
`GET /health` => `{ "status": "ok", "service": "tasks" }`

## Future Checklist
| Item | Status |
|------|--------|
| Tech stack decided | ☐ |
| Health endpoint | ☐ |
| Task lifecycle model | ☐ |
| Persistence layer | ☐ |
| SLA / deadline tracking | ☐ |
| Readiness probe | ☐ |
| API schema | ☐ |
| Event bus integration | ☐ |
| Observability | ☐ |

Follow `docs/services/CONVENTIONS.md`.
