import { Notification } from '../types/index.js';

export const notifications: Notification[] = [];

export function addNotification(notification: Notification): void {
  notifications.push(notification);
}

export function getUserNotifications(userId: string): Notification[] {
  return notifications.filter(n => n.recipientId === userId);
}

export function getAllNotifications(): Notification[] {
  return notifications;
}

export function getNextNotificationId(): string {
  return String(notifications.length + 1);
}
