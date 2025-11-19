import { kafka, setConsumer } from '../config/kafka.js';
import { Notification } from '../types/index.js';
import { addNotification } from '../storage/notificationStore.js';
import { sendEmail } from '../services/emailService.js';

export async function initConsumer(retryCount = 0, maxRetries = 5) {
  try {
    console.log(`🔄 Initializing Kafka consumer (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    const consumer = kafka.consumer({ groupId: 'notifications-consumer' });
    setConsumer(consumer);
    
    await Promise.race([
      consumer.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 30000))
    ]);
    
    await consumer.subscribe({ topic: 'notifications', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }: any) => {
        try {
          const notificationData = JSON.parse(message.value.toString());
          
          const notification: Notification = {
            id: String(Date.now()),
            recipientId: String(notificationData.recipientId),
            recipientEmail: notificationData.recipientEmail,
            type: notificationData.type,
            message: notificationData.message,
            createdAt: notificationData.createdAt || new Date().toISOString()
          };
          
          addNotification(notification);
          
          console.log(`📬 Notification received and stored:`, {
            id: notification.id,
            type: notification.type,
            recipientId: notification.recipientId,
            message: notification.message.substring(0, 50) + '...'
          });
          
          await sendEmail(notification, notification.recipientEmail);
          
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      }
    });
    
    console.log('✅ Kafka consumer started and listening for notifications');
  } catch (error) {
    console.error(`⚠️  Kafka consumer failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`🕒 Retrying in ${delay}ms...`);
      setTimeout(() => initConsumer(retryCount + 1, maxRetries), delay);
    } else {
      console.error('❌ Max retries exceeded for Kafka consumer. Service will continue without Kafka.');
    }
  }
}
