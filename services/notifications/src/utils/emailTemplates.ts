import { Notification } from '../types/index.js';

export function getEmailSubject(type: string): string {
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

export function getEmailHTML(notification: Notification): string {
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
