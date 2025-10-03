import 'dotenv/config';
import express from 'express';

const PORT = Number(process.env.PORT || 8006);
const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notifications' });
});

app.listen(PORT, () => {
  console.log(`notifications service listening on ${PORT}`);
});
