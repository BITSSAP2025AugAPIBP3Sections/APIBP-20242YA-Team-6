import { Kafka } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

const kafka = new Kafka({
  clientId: 'attendees-service',
  brokers: KAFKA_BROKERS,
  retry: { initialRetryTime: 100, retries: 8 }
});

let producer = null;

export async function initKafka() {
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('✅ Kafka producer connected');
  } catch (error) {
    console.error('⚠️  Kafka connection failed:', error.message);
  }
}

export async function publishNotification(recipientId, type, message, eventData = {}) {
  if (!producer) return;
  try {
    await producer.send({
      topic: 'notifications',
      messages: [{
        key: String(recipientId),
        value: JSON.stringify({
          recipientId: String(recipientId),
          type,
          message,
          eventData,
          createdAt: new Date().toISOString()
        })
      }]
    });
    console.log(`📤 Notification published: ${type} to user ${recipientId}`);
  } catch (error) {
    console.error('Error publishing notification:', error);
  }
}

export async function disconnectKafka() {
  if (producer) {
    try {
      await producer.disconnect();
      console.log('✅ Kafka producer disconnected');
    } catch (error) {
      console.error('⚠️  Error disconnecting Kafka:', error.message);
    }
  }
}