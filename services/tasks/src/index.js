import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './config/database.js';
import { initKafka } from './config/kafka.js';
import taskRoutes from './routes/taskRoutes.js';

const PORT = Number(process.env.PORT || 8004);
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tasks' });
});

app.use('/v1', taskRoutes);

initDB().then(async () => {
  await initKafka();
  app.listen(PORT, () => {
    console.log(`Tasks service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
