import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 8005;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'attendees' });
});

app.get('/api/attendees/ping', (_req, res) => {
  res.json({ pong: true });
});

app.listen(PORT, () => {
  console.log(`attendees service listening on ${PORT}`);
});
