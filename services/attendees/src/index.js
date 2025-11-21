import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './config/database.js';
import { initKafka } from './config/kafka.js';
import attendeeRoutes from './routes/attendeeRoutes.js';

const PORT = Number(process.env.PORT || 8005);
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'attendees' });
});

app.use('/v1', attendeeRoutes);

initDB().then(async () => {
  await initKafka();
  app.listen(PORT, () => {
    console.log(`Attendees service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
