import { kafka, setConsumer } from '../config/kafka.js';
import { Notification } from '../types/index.js';
import { addNotification } from '../storage/notificationStore.js';
import { sendEmail } from '../services/emailService.js';

export async function initConsumer(retryCount = 0, maxRetries = 5) {
  try {
    console.log(`🔄 Initializing Kafka consumer (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    const consumer = kafka.consumer({ 
      groupId: 'notifications-consumer',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000
    });
    setConsumer(consumer);
    
    await Promise.race([
      consumer.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 30000))
    ]);
    
    await consumer.subscribe({ topic: 'notifications', fromBeginning: false });
    
    await consumer.run({
      eachBatchAutoResolve: false,
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }: any) => {
        const notifications: Notification[] = [];
        
        for (const message of batch.messages) {
          try {
            const notificationData = JSON.parse(message.value.toString());
            
            const notification: Notification = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              recipientId: String(notificationData.recipientId),
              recipientEmail: notificationData.recipientEmail,
              type: notificationData.type,
              message: notificationData.message,
              createdAt: notificationData.timestamp || notificationData.createdAt || new Date().toISOString()
            };
            
            notifications.push(notification);
            addNotification(notification);
            
            resolveOffset(message.offset);
          } catch (error) {
            console.error('Error parsing notification:', error);
            resolveOffset(message.offset);
          }
        }
        
        if (notifications.length > 0) {
          console.log(`📬 Processed batch: ${notifications.length} notifications`);
          
          // Send emails in parallel with error handling per email
          await Promise.allSettled(
            notifications.map(n => sendEmail(n, n.recipientEmail))
          );
        }
        
        await commitOffsetsIfNecessary();
        await heartbeat();
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
