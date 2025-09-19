import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';

// E-Mail-Konfiguration mit Anti-Spam-Einstellungen
const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ionos.de',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true für 465, false für andere Ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Verhindert Zertifikatsfehler
    rejectUnauthorized: false
  },
  // Anti-Spam-Einstellungen
  pool: true,
  maxConnections: 1,
  maxMessages: 3,
  rateLimit: 14, // max 14 emails per second
});

export interface WelcomeEmailData {
  name: string;
  email: string;
  verificationUrl?: string;
}


export async function sendWelcomeEmail({ name, email, verificationUrl }: WelcomeEmailData) {
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Willkommen bei 3DarterDE!',
    // Anti-Spam Headers
    headers: {
      'X-Mailer': '3DarterDE System',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
      'X-Report-Abuse': 'Please report abuse to service@3darter.de',
      'List-Unsubscribe': '<mailto:unsubscribe@3darter.de>',
      'Return-Path': process.env.SMTP_FROM || process.env.SMTP_USER,
    } as any,
    // Text-Version für bessere Spam-Bewertung
    text: `Hallo ${name}!\n\nHerzlich willkommen bei 3DarterDE - deinem Spezialisten für Darts und 3D-Druck!\n\nWas erwartet dich?\n• Hochwertige Dartpfeile und -scheiben\n• 3D-gedruckte Dart-Zubehör\n• Schneller und sicherer Versand\n• Persönlicher Kundenservice\n\nDu kannst dich jetzt in unserem Shop umsehen und deine ersten Bestellungen aufgeben.\n\nShop besuchen: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/shop\n\nBei Fragen stehen wir dir gerne zur Verfügung:\nE-Mail: service@3darter.de\nWebsite: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}\n\nMit freundlichen Grüßen\nDein 3DarterDE Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Willkommen bei 3DarterDE</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <h2>Hallo ${name}!</h2>
            <p>Herzlich willkommen bei 3DarterDE - deinem Spezialisten für Darts und 3D-Druck!</p>
            
            <h3>Was erwartet dich?</h3>
            <ul>
              <li>🏆 Hochwertige Dartpfeile und -scheiben</li>
              <li>🖨️ 3D-gedruckte Dart-Zubehör</li>
              <li>📦 Schneller und sicherer Versand</li>
              <li>💬 Persönlicher Kundenservice</li>
            </ul>
            
            <p>Du kannst dich jetzt in unserem Shop umsehen und deine ersten Bestellungen aufgeben.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/shop" class="button">
                Jetzt einkaufen
              </a>
            </div>
            
            <h3>Kontakt & Support</h3>
            <p>Bei Fragen stehen wir dir gerne zur Verfügung:</p>
            <ul>
              <li>📧 E-Mail: <a href="mailto:service@3darter.de">service@3darter.de</a></li>
              <li>🌐 Website: <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}">3darter.de</a></li>
            </ul>
          </div>
          <div class="footer">
            <p>Mit freundlichen Grüßen<br>Dein 3DarterDE Team</p>
            <p>Diese E-Mail wurde automatisch generiert. Bitte antworte nicht direkt auf diese E-Mail.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error };
  }
}

export async function sendVerificationEmail({ name, email, verificationUrl, code }: WelcomeEmailData & { code?: string }) {
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Bestätigungscode für deinen Account - 3DarterDE',
    // Anti-Spam Headers
    headers: {
      'X-Mailer': '3DarterDE System',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
      'X-Report-Abuse': 'Please report abuse to service@3darter.de',
      'Return-Path': process.env.SMTP_FROM || process.env.SMTP_USER,
    } as any,
    // Text-Version für bessere Spam-Bewertung
    text: `Hallo ${name}!\n\nVielen Dank für deine Registrierung bei 3DarterDE! 🎉\n\nUm deinen Account zu aktivieren, gib bitte den folgenden Bestätigungscode ein:\n\n${code ? `Code: ${code}\n\nDer Code ist 10 Minuten gültig.\n` : ''}\nFalls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.\n\nMit freundlichen Grüßen\nDein 3DarterDE Team\n\nBei Fragen erreichst du uns unter: service@3darter.de`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bestätigungscode</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-container { text-align: center; margin: 30px 0; }
          .verification-code { 
            display: inline-block; 
            font-family: 'Courier New', monospace; 
            font-size: 32px; 
            font-weight: bold;
            letter-spacing: 8px; 
            padding: 20px 30px; 
            border: 3px solid #3B82F6; 
            border-radius: 12px; 
            background: linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%); 
            color: #1d4ed8;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <h2>Hallo ${name}!</h2>
            <p>Vielen Dank für deine Registrierung bei 3DarterDE! 🎉</p>
            <p>Um deinen Account zu aktivieren, gib bitte den folgenden Bestätigungscode ein:</p>
            
            ${typeof code === 'string' ? `
            <div class="code-container">
              <div class="verification-code">
                ${code}
              </div>
            </div>
            <div class="highlight">
              <p style="margin: 0; font-weight: bold; color: #92400e;">
                ⏰ Der Code ist 10 Minuten gültig
              </p>
            </div>
            ` : ''}
            
            <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">
              Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
            </p>
          </div>
          <div class="footer">
            <p>Mit freundlichen Grüßen,<br><strong>Dein 3DarterDE Team</strong></p>
            <p>Bei Fragen erreichst du uns unter: <a href="mailto:service@3darter.de" style="color: #3B82F6;">service@3darter.de</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
}

