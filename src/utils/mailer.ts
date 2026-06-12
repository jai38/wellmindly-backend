import nodemailer from 'nodemailer';
import { env } from '../config/env';

const hasSmtpConfig = !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for port 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
      });
      console.log(`✉️ Email sent to ${to} via SMTP`);
    } catch (err) {
      console.error(`❌ Failed to send email via SMTP to ${to}:`, err);
      logToConsoleFallback(to, subject, html);
    }
  } else {
    logToConsoleFallback(to, subject, html);
  }
}

function logToConsoleFallback(to: string, subject: string, html: string) {
  // Pull code out of HTML template if possible
  const codeMatch = html.match(/class="otp-code"[^>]*>([^<]+)/i) || html.match(/<h2[^>]*>([^<]+)/i);
  const code = codeMatch ? codeMatch[1].trim() : 'N/A';

  console.log(`
==================================================
📧  WELLMINDLY EMAIL VERIFICATION (FALLBACK CONSOLE LOG)
To: ${to}
Subject: ${subject}
Code: ${code}
==================================================
  `);
}

export function getOtpTemplate(code: string, purpose: 'register' | 'forgot_password'): string {
  const title = purpose === 'register' ? 'Verify Your Account' : 'Reset Your Password';
  const subtitle = purpose === 'register' 
    ? 'Thank you for joining Wellmindly. Use the verification code below to complete your registration.'
    : 'We received a request to reset your password. Use the verification code below to proceed.';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F7F9F7;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 24px;
      border: 1px solid #E2E8F0;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(27, 36, 51, 0.03), 0 8px 10px -6px rgba(27, 36, 51, 0.03);
    }
    .header {
      background-color: #ffffff;
      padding: 40px 40px 10px 40px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      width: 46px;
      height: 46px;
      line-height: 46px;
      background-color: #ffffff;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      text-align: center;
      box-shadow: 0 4px 10px -2px rgba(27, 36, 51, 0.08);
      margin-right: 10px;
      vertical-align: middle;
    }
    .logo-heart {
      font-size: 20px;
      color: #7A5B93;
      vertical-align: middle;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 900;
      color: #1B2433;
      letter-spacing: -0.5px;
      vertical-align: middle;
    }
    .content {
      padding: 20px 40px 40px 40px;
      color: #4F596F;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #1B2433;
      margin-top: 0;
      margin-bottom: 12px;
      text-align: center;
    }
    .description {
      font-size: 15px;
      line-height: 24px;
      color: #4F596F;
      margin-bottom: 32px;
      text-align: center;
    }
    .otp-card {
      background-color: #F7F9F7;
      border: 1px dashed #E2E8F0;
      border-radius: 20px;
      padding: 28px;
      text-align: center;
      margin-bottom: 32px;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      color: #4F596F;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-size: 42px;
      font-weight: 800;
      color: #7A5B93; /* Plum brand color */
      letter-spacing: 8px;
      margin: 0;
      padding: 8px 0;
    }
    .expiry {
      font-size: 13px;
      font-weight: 700;
      color: #C86B56; /* Coral brand color */
      margin-top: 12px;
      margin-bottom: 0;
    }
    .footer {
      background-color: #EEF2EE;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #E2E8F0;
    }
    .footer-text {
      font-size: 12px;
      line-height: 20px;
      color: #4F596F;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: inline-block; text-decoration: none;">
        <div class="logo-badge">
          <span class="logo-heart">💜</span>
        </div>
        <span class="logo-text">WellMindly</span>
      </div>
    </div>
    <div class="content">
      <h1>${title}</h1>
      <p class="description">${subtitle}</p>
      
      <div class="otp-card">
        <div class="otp-label">Verification Code</div>
        <h2 class="otp-code">${code}</h2>
        <p class="expiry">Expires in 5 minutes</p>
      </div>
      
      <p style="font-size: 13px; color: #4F596F; line-height: 22px; text-align: center; margin-bottom: 0;">
        If you did not request this verification, please ignore this email or secure your account.
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">&copy; 2026 WellMindly. All rights reserved.</p>
      <p class="footer-text" style="margin-top: 4px; font-style: italic;">Empowering minds, step by step.</p>
    </div>
  </div>
</body>
</html>
  `;
}
