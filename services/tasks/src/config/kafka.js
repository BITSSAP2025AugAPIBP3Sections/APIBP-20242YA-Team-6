import { Kafka } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

const kafka = new Kafka({
    clientId: 'tasks-service',
    brokers: KAFKA_BROKERS,
    retry: { initialRetryTime: 100, retries: 5 },
    connectionTimeout: 10000
});

let producer = null;
let isConnected = false;

export async function initKafka() {
    try {
        producer = kafka.producer({ idempotent: true });
        await producer.connect();
        isConnected = true;
        console.log('✅ Kafka producer connected');
    } catch (error) {
        isConnected = false;
        console.error('⚠️  Kafka connection failed:', error.message);
    }
}

export async function publishNotification(recipientId, type, message, metadata = {}, recipientEmail = null) {
    if (!producer || !isConnected) {
        console.warn('⚠️  Skipping notification - Kafka not available');
        return false;
    }
    try {
        await producer.send({
            topic: 'notifications',
            messages: [{
                key: String(recipientId),
                value: JSON.stringify({
                    recipientId: String(recipientId),
                    recipientEmail,
                    type,
                    message,
                    metadata,
                    source: 'tasks-service',
                    timestamp: new Date().toISOString()
                })
            }]
        });
        return true;
    } catch (error) {
        console.error('❌ Failed to publish notification:', error.message);
        return false;
    }
}

export async function disconnectKafka() {
    if (producer) {
        await producer.disconnect();
        isConnected = false;
    }
}
