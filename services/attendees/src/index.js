import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB, pool } from './config/database.js';
import { initKafka, disconnectKafka } from './config/kafka.js';
import { startGrpcServer } from './config/grpcServer.js';
import attendeeRoutes from './routes/attendeeRoutes.js';

const PORT = Number(process.env.PORT || 8005);
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'attendees' });
});

app.use('/v1', attendeeRoutes);

let server;

initDB().then(async () => {
  await initKafka();
  
  // Start gRPC server
  startGrpcServer();
  
  server = app.listen(PORT, () => {
    console.log(`✅ Attendees service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown for Kubernetes
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  if (server) {
    server.close(async () => {
      await disconnectKafka();
      await pool.end();
      console.log('✅ Attendees service shut down complete');
      process.exit(0);
    });
  }
});
