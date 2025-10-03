# Vendors Service

Status: Scaffold only (no business logic yet).

## Planned Responsibilities
Manage vendors, capability tags, assignments to tasks/events, performance metadata.

## Current State
Empty – implement with tech stack of choice.

## Port
Reserved: `8003`.

## Contract
`GET /health` => `{ "status": "ok", "service": "vendors" }`

## Future Checklist
| Item | Status |
|------|--------|
| Tech stack decided | ☐ |
| Health endpoint | ☐ |
| Vendor model & validation | ☐ |
| Assignment linkage (events/tasks) | ☐ |
| Persistence layer | ☐ |
| Readiness probe | ☐ |
| API schema | ☐ |
| Event bus integration | ☐ |
| Observability | ☐ |

See shared conventions: `docs/services/CONVENTIONS.md`.
