import { Request, Response } from 'express';
import { getUserNotifications, addNotification, getNextNotificationId } from '../storage/notificationStore.js';
import { getProducer } from '../config/kafka.js';
import { Notification } from '../types/index.js';

export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ detail: 'Unauthorized' });
    }
    const userNotifications = getUserNotifications(userId);
    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

export async function createNotification(req: Request, res: Response) {
  try {
    const { recipientId, type, message } = req.body;
    const notification: Notification = {
      id: getNextNotificationId(),
      recipientId,
      type,
      message,
      createdAt: new Date().toISOString()
    };
    
    addNotification(notification);
    
    const producer = getProducer();
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
}
