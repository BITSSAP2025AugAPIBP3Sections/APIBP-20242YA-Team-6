import { Notification } from '../types/index.js';
import { transporter, emailConfig } from '../config/email.js';
import { getUserEmail } from '../utils/externalServices.js';
import { getEmailSubject, getEmailHTML } from '../utils/emailTemplates.js';

export async function sendEmail(notification: Notification, recipientEmail?: string) {
  if (!emailConfig.enabled) {
    console.log(`📧 Email sending disabled. Would have sent: ${notification.message}`);
    return;
  }

  try {
    let to = recipientEmail;
    
    if (!to) {
      console.log(`⚠️  No recipientEmail provided, fetching from auth service for user ${notification.recipientId}`);
      to = await getUserEmail(notification.recipientId);
    }
    
    if (!to) {
      console.error(`❌ Could not determine email for user ${notification.recipientId}, skipping notification`);
      return;
    }
    
    const mailOptions = {
      from: emailConfig.from,
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
