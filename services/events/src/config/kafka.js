import { Kafka } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

const kafka = new Kafka({
  clientId: 'events-service',
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

export async function publishNotification(recipientId, type, message, eventData = {}, recipientEmail = null) {
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
          recipientEmail,
          createdAt: new Date().toISOString()
        })
      }]
    });
  } catch (error) {
    console.error('Failed to publish notification:', error);
  }
}
