import 'dotenv/config';
import express from 'express';

const PORT = Number(process.env.PORT || 8001);
const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

app.listen(PORT, () => {
  console.log(`Auth service listening on ${PORT}`);
});
