import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { Kafka, Producer } from 'kafkajs';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 8006);
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@eventmanagement.com';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

const app = express();
app.use(cors());
app.use(express.json());

const kafka = new Kafka({
  clientId: 'notifications-service',
  brokers: KAFKA_BROKERS,
  retry: { initialRetryTime: 100, retries: 8 }
});

interface Notification {
  id: string;
  recipientId: string;
  recipientEmail?: string;
  type: string;
  message: string;
  createdAt: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

let producer: Producer | null = null;
let consumer: any = null;
const notifications: Notification[] = [];

// Create email transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465, // true for 465, false for other ports
  auth: EMAIL_USER && EMAIL_PASS ? {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  } : undefined,
  // For development/testing without real SMTP
  ...((!EMAIL_USER || !EMAIL_PASS) && {
    streamTransport: true,
    newline: 'unix',
    buffer: true
  })
});

// Function to fetch user email from auth service
async function getUserEmail(userId: string): Promise<string | undefined> {
  try {
    const response = await fetch(`http://auth-service:8001/v1/users/${userId}`);
    if (response.ok) {
      const user: any = await response.json();
      return user.email || undefined;
    }
  } catch (error) {
    console.error(`⚠️  Failed to fetch email for user ${userId}:`, error);
  }
  return undefined;
}

// Function to send email
async function sendEmail(notification: Notification, recipientEmail?: string) {
  if (!EMAIL_ENABLED) {
    console.log(`📧 Email sending disabled. Would have sent: ${notification.message}`);
    return;
  }

  try {
    let to = recipientEmail;
    
    // Only fallback to user lookup if recipientEmail is truly missing
    if (!to) {
      console.log(`⚠️  No recipientEmail provided, fetching from auth service for user ${notification.recipientId}`);
      to = await getUserEmail(notification.recipientId);
    }
    
    if (!to) {
      console.error(`❌ Could not determine email for user ${notification.recipientId}, skipping notification`);
      return;
    }
    
    const mailOptions = {
      from: EMAIL_FROM,
      to: to,
      subject: getEmailSubject(notification.type),
      text: notification.message,
      html: getEmailHTML(notification)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}:`, info.messageId || 'Message logged');
  } catch (error) {
    console.error(`❌ Failed to send email for notification ${notification.id}:`, error);
  }
}

// Helper function to get email subject based on notification type
function getEmailSubject(type: string): string {
  const subjects: { [key: string]: string } = {
    'event_created': '🎉 New Event Created',
    'rsvp_confirmed': '✅ RSVP Confirmed',
    'new_attendee': '👥 New Attendee for Your Event',
    'task_assigned': '📋 New Task Assigned',
    'event_updated': '📝 Event Updated',
    'event_cancelled': '❌ Event Cancelled'
  };
  return subjects[type] || '📬 New Notification';
}

// Helper function to generate HTML email content
function getEmailHTML(notification: Notification): string {
  const emoji = notification.message.match(/^[^\w\s]+/)?.[0] || '📬';
  const message = notification.message.replace(/^[^\w\s]+\s*/, '');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .emoji { font-size: 48px; margin-bottom: 10px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .message { font-size: 16px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji">${emoji}</div>
          <h1>Event Management System</h1>
        </div>
        <div class="content">
          <div class="message">${message}</div>
          <p style="color: #666; font-size: 14px;">
            This notification was sent on ${new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        <div class="footer">
          <p>Event Management System - Automated Notification</p>
          <p>Please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Kafka Consumer with retry logic
async function initConsumer(retryCount = 0, maxRetries = 5) {
  try {
    console.log(`🔄 Initializing Kafka consumer (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    consumer = kafka.consumer({ groupId: 'notifications-consumer' });
    
    // Add connection timeout and retry logic
    await Promise.race([
      consumer.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 30000))
    ]);
    
    await consumer.subscribe({ topic: 'notifications', fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }: any) => {
        try {
          const notificationData = JSON.parse(message.value.toString());
          
          // Store notification in memory
          const notification: Notification = {
            id: String(notifications.length + 1),
            recipientId: String(notificationData.recipientId),
            recipientEmail: notificationData.recipientEmail,
            type: notificationData.type,
            message: notificationData.message,
            createdAt: notificationData.createdAt || new Date().toISOString()
          };
          
          notifications.push(notification);
          
          console.log(`📬 Notification received and stored:`, {
            id: notification.id,
            type: notification.type,
            recipientId: notification.recipientId,
            message: notification.message.substring(0, 50) + '...'
          });
          
          // Send email notification
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
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
      console.log(`🕒 Retrying in ${delay}ms...`);
      setTimeout(() => initConsumer(retryCount + 1, maxRetries), delay);
    } else {
      console.error('❌ Max retries exceeded for Kafka consumer. Service will continue without Kafka.');
    }
  }
}

function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authorization token missing or invalid' });
  }
  const token = authHeader.substring(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token has expired' });
    }
    return res.status(401).json({ detail: 'Invalid token' });
  }
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Insufficient permissions' });
    }
    next();
  };
}

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'notifications' });
});

app.get('/v1/notifications', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    const userNotifications = notifications.filter(n => n.recipientId === userId);
    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.post('/v1/notifications', verifyToken, requireRole('admin', 'organizer'), [body('recipientId').notEmpty(), body('type').notEmpty().trim(), body('message').notEmpty().trim()], validate, async (req: Request, res: Response) => {
  try {
    const { recipientId, type, message } = req.body;
    const notification: Notification = {
      id: String(notifications.length + 1),
      recipientId,
      type,
      message,
      createdAt: new Date().toISOString()
    };
    notifications.push(notification);
    if (producer) {
      await producer.send({
        topic: 'notifications',
        messages: [{ key: recipientId, value: JSON.stringify(notification) }]
      });
    }
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

async function startServer() {
  try {
    // Connect producer with retry logic
    producer = kafka.producer();
    
    console.log('🔄 Connecting Kafka producer...');
    await Promise.race([
      producer.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Producer connection timeout')), 30000))
    ]);
    console.log('✅ Kafka producer connected');
    
    // Ensure topic exists (create if necessary)
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
    
    // Start consumer with delay to ensure topic is ready
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (consumer) await consumer.disconnect();
  if (producer) await producer.disconnect();
  process.exit(0);
});

startServer();
