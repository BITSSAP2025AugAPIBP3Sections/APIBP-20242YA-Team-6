import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { initProducer, ensureTopic, disconnectKafka } from './config/kafka.js';
import { initConsumer } from './services/consumerService.js';
import notificationRoutes from './routes/notificationRoutes.js';

const PORT = Number(process.env.PORT || 8006);
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'notifications' });
});

app.use('/v1', notificationRoutes);

async function startServer() {
  try {
    await initProducer();
    await ensureTopic();
    
    setTimeout(() => initConsumer(), 2000);
    
    app.listen(PORT, () => {
      console.log(`🔔 Notifications service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to Kafka:', error);
    app.listen(PORT, () => {
      console.log(`🔔 Notifications service listening on port ${PORT} (Kafka disabled)`);
    });
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});

startServer();
