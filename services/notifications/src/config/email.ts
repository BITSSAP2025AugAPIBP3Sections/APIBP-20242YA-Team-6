import nodemailer from 'nodemailer';

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@eventmanagement.com';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

// Create email transporter
export const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: EMAIL_USER && EMAIL_PASS ? {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  } : undefined,
  ...((!EMAIL_USER || !EMAIL_PASS) && {
    streamTransport: true,
    newline: 'unix',
    buffer: true
  })
});

export const emailConfig = {
  enabled: EMAIL_ENABLED,
  from: EMAIL_FROM
};
