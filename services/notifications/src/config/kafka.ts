import { Kafka, Producer, Consumer } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

const kafka = new Kafka({
  clientId: 'notifications-service',
  brokers: KAFKA_BROKERS,
  retry: { initialRetryTime: 100, retries: 8 }
});

let producer: Producer | null = null;
let consumer: Consumer | null = null;

export async function initProducer() {
  try {
    producer = kafka.producer();
    console.log('🔄 Connecting Kafka producer...');
    await Promise.race([
      producer.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Producer connection timeout')), 30000))
    ]);
    console.log('✅ Kafka producer connected');
    return producer;
  } catch (error) {
    console.error('Failed to connect Kafka producer:', error);
    throw error;
  }
}

export async function ensureTopic() {
  const admin = kafka.admin();
  try {
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes('notifications')) {
      console.log('📝 Creating notifications topic...');
      await admin.createTopics({
        topics: [
          {
            topic: 'notifications',
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
      });
      console.log('✅ Notifications topic created');
    } else {
      console.log('✅ Notifications topic already exists');
    }
    await admin.disconnect();
  } catch (adminError) {
    console.log('ℹ️  Topic management failed (topic may already exist):', adminError);
  }
}

export function getProducer(): Producer | null {
  return producer;
}

export function getConsumer(): Consumer | null {
  return consumer;
}

export function setConsumer(c: Consumer) {
  consumer = c;
}

export async function disconnectKafka() {
  if (consumer) await consumer.disconnect();
  if (producer) await producer.disconnect();
}

export { kafka };
