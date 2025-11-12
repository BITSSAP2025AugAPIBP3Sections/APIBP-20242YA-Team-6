# Notifications Service

Status: Scaffold only.

## Planned Responsibilities
- Dispatch user / system notifications (email, push, in-app)
- Subscribe to domain events (Kafka topics) and emit notification tasks
- Handle delivery retries & dead-letter queue (future)

## Current State
No implementation yet. Provide only `/health` initially.

## Port
`8006` (overridable with `PORT`).

## Environment Variables (Planned)
| Variable | Purpose |
|----------|---------|
| PORT | Service port |
| KAFKA_BROKERS | Comma-separated broker list (e.g. `kafka:9092`) |
| KAFKA_CLIENT_ID | Optional custom client id |
| NOTIFY_QUEUE_STRATEGY | Future config |

## Kafka Topics (Placeholder)
| Topic | Purpose | Status |
|-------|---------|--------|
| events.domain.created | Example consumption | TBD |
| events.tasks.dueSoon | Example consumption | TBD |
| notifications.outbound | Aggregated outgoing messages | TBD |

Topics will be finalized in an ADR before implementation.

## Minimal Node Skeleton (Optional)
```
import 'dotenv/config';
import express from 'express';
const app = express();
const PORT = Number(process.env.PORT || 8006);
app.get('/health', (_req,res)=>res.json({status:'ok', service:'notifications'}));
app.listen(PORT, ()=> console.log(`notifications listening on ${PORT}`));
```

## Future Checklist
| Item | Status |
|------|--------|
| Stack chosen | ☐ |
| Health endpoint | ☐ |
| Kafka client integration | ☐ |
| Topic naming ADR | ☐ |
| Retry / DLQ strategy | ☐ |
| Persistence (outbox?) | ☐ |
| Observability (metrics) | ☐ |
| Readiness probe | ☐ |

See `docs/services/CONVENTIONS.md` for base rules.
