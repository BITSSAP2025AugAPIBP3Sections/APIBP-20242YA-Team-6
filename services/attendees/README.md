# Attendees Service

Status: Scaffold only (no business logic yet).

## Planned Responsibilities
RSVP handling, attendance state, capacity tracking, attendee metadata.

## Current State
Empty – pick a stack and implement.

## Port
Reserved: `8005`.

## Contract
`GET /health` => `{ "status": "ok", "service": "attendees" }`

## Future Checklist
| Item | Status |
|------|--------|
| Tech stack decided | ☐ |
| Health endpoint | ☐ |
| RSVP model | ☐ |
| Persistence layer | ☐ |
| Capacity logic | ☐ |
| Readiness probe | ☐ |
| API schema | ☐ |
| Event bus integration | ☐ |
| Observability | ☐ |

See `docs/services/CONVENTIONS.md` for shared rules.
