import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './config/database.js';
import { initKafka } from './config/kafka.js';
import eventRoutes from './routes/eventRoutes.js';

const PORT = Number(process.env.PORT || 8002);
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'events' });
});

app.use('/v1', eventRoutes);

initDB().then(async () => {
  await initKafka();
  app.listen(PORT, () => {
    console.log(`Events service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
