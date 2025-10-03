import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 8004;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tasks' });
});

app.get('/api/tasks/ping', (_req, res) => {
  res.json({ pong: true });
});

app.listen(PORT, () => {
  console.log(`tasks service listening on ${PORT}`);
});
