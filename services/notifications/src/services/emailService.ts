import { Notification } from '../types/index.js';
import { transporter, emailConfig } from '../config/email.js';
import { getEmailSubject, getEmailHTML } from '../utils/emailTemplates.js';

export async function sendEmail(notification: Notification, recipientEmail?: string) {
  if (!emailConfig.enabled) {
    return;
  }

  try {
    const to = recipientEmail || notification.recipientEmail;
    
    if (!to) {
      console.warn(`⚠️  No email provided for notification ${notification.id}`);
      return;
    }
    
    const mailOptions = {
      from: emailConfig.from,
      to: to,
      subject: getEmailSubject(notification.type),
      text: notification.message,
      html: getEmailHTML(notification)
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (error: any) {
    console.error(`❌ Email failed for ${notification.id}:`, error.message);
  }
}
