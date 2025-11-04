import 'dotenv/config';
import express from 'express';

const PORT = Number(process.env.PORT || 8002);
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'events' });
});

app.get('/ready', (_req, res) => {
  // Placeholder readiness logic (future: DB ping)
  res.json({ ready: true });
});

app.get('/api/events/ping', (_req, res) => {
  res.json({ pong: true });
});

app.listen(PORT, () => {
  console.log(`Events service listening on ${PORT}`);
});