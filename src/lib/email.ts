import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { getTrackingUrl, getTrackingProviderName } from './tracking-urls';
import { LOGO_BASE64 } from './logo-base64';

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

export interface GenericEmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Generic email function
export async function sendEmail({ to, subject, text, html }: GenericEmailData) {
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
    headers: {
      'X-Mailer': '3DarterDE System',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
      'X-Report-Abuse': 'Please report abuse to service@3darter.de',
      'Return-Path': process.env.SMTP_FROM || process.env.SMTP_USER,
    } as any,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
          .content { background: #f8fafc; padding: 30px; border-radius: 10px; color: #333; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">Hallo ${name}!</h2>
              <img src="${LOGO_BASE64}" alt="3DarterDE Logo" style="max-width: 80px; height: auto;" />
            </div>
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
            
            <div class="footer">
              <p>Mit freundlichen Grüßen</p>
              <p>Dein 3DarterDE Team</p>
            </div>
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

export interface OrderConfirmationEmailData {
  name: string;
  email: string;
  orderNumber: string;
  items: {
    name: string;
    price: number;
    quantity: number;
    image?: string;
    variations?: Record<string, string>;
  }[];
  subtotal: number;
  shippingCosts: number;
  total: number;
  bonusPointsEarned: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    street: string;
    houseNumber: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    street: string;
    houseNumber: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: string;
}

export interface TrackingEmailData {
  name: string;
  email: string;
  orderNumber: string;
  trackingInfo: Array<{
    trackingNumber: string;
    shippingProvider: string;
    notes?: string;
  }>;
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    street: string;
    houseNumber: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export async function sendTrackingEmail({ name, email, orderNumber, trackingInfo, shippingAddress }: TrackingEmailData) {
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Sendungsverfolgung für Bestellung ${orderNumber} - 3DarterDE`,
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
    text: `Hallo ${name}!\n\nDeine Bestellung ${orderNumber} wurde versandt! 📦\n\nSendungsverfolgung:\n${trackingInfo.map((tracking, index) => {
      const trackingUrl = getTrackingUrl(tracking.shippingProvider, tracking.trackingNumber);
      const providerName = getTrackingProviderName(tracking.shippingProvider);
      return `${index + 1}. ${tracking.trackingNumber} (${providerName})${tracking.notes ? ` - ${tracking.notes}` : ''}${trackingUrl ? `\n   Link: ${trackingUrl}` : ''}`;
    }).join('\n')}\n\nLieferadresse:\n${shippingAddress.street} ${shippingAddress.houseNumber}\n${shippingAddress.postalCode} ${shippingAddress.city}\n${shippingAddress.country}\n\nDu kannst deine Sendung mit den oben genannten Sendungsnummern verfolgen.\n\n⭐ BEWERTUNG ABGEBEN UND BONUSPUNKTE VERDIENEN!\n\nNach der Lieferung kannst du gerne eine Bewertung für deine Produkte abgeben und dabei weitere Bonuspunkte verdienen!\n\n💎 Hinweis: Bonuspunkte werden nach 2 Wochen automatisch gutgeschrieben, um sicherzustellen, dass du mit deinem Kauf zufrieden bist.\n\nSo geht's:\n1. Gehe zu deiner Bestellübersicht (Menü: "Meine Bestellungen")\n2. Klicke bei der gelieferten Bestellung auf "Bewertung abgeben"\n3. Gib Sterne-Bewertungen ab (Titel und Kommentar sind optional)\n4. Erhalte automatisch Bonuspunkte für deine Bewertung!\n\nMit freundlichen Grüßen\nDein 3DarterDE Team\n\nBei Fragen erreichst du uns unter: service@3darter.de`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sendungsverfolgung - 3DarterDE</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 10px; color: #333; }
          .tracking-item { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3B82F6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .tracking-number { font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #1d4ed8; }
          .shipping-provider { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
          .address { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">Hallo ${name}!</h2>
              <img src="${LOGO_BASE64}" alt="3DarterDE Logo" style="max-width: 80px; height: auto;" />
            </div>
            <p>Deine Bestellung <strong>${orderNumber}</strong> wurde versandt! 📦</p>
            <p>Du kannst deine Sendung mit den folgenden Sendungsnummern verfolgen:</p>
            
            ${trackingInfo.map((tracking, index) => {
              const trackingUrl = getTrackingUrl(tracking.shippingProvider, tracking.trackingNumber);
              const providerName = getTrackingProviderName(tracking.shippingProvider);
              return `
            <div class="tracking-item">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="background: #3B82F6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px;">${index + 1}</span>
                <span class="tracking-number">${tracking.trackingNumber}</span>
                <span class="shipping-provider">${providerName}</span>
              </div>
              ${tracking.notes ? `<p style="margin: 0; color: #6b7280; font-style: italic;">${tracking.notes}</p>` : ''}
              ${trackingUrl ? `
              <div style="margin-top: 10px;">
                <a href="${trackingUrl}" target="_blank" style="display: inline-block; background: #3B82F6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
                  📦 Sendung verfolgen
                </a>
              </div>
              ` : ''}
            </div>
            `;
            }).join('')}
            
            <div class="address">
              <h3 style="margin-top: 0;">Lieferadresse:</h3>
              <p style="margin: 0;">
                ${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}<br>
                ${shippingAddress.street} ${shippingAddress.houseNumber}<br>
                ${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '<br>' : ''}
                ${shippingAddress.postalCode} ${shippingAddress.city}<br>
                ${shippingAddress.country}
              </p>
            </div>
            
            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <strong>💡 Tipp:</strong> Du kannst deine Sendung direkt auf der Website des Versanddienstleisters verfolgen.
            </p>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #0c4a6e;">⭐ Bewertung abgeben</h3>
              <p style="margin: 0 0 10px 0;">Nach der Lieferung kannst du gerne eine Bewertung für deine Produkte abgeben und dabei <strong>weitere Bonuspunkte</strong> verdienen!</p>
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #0c4a6e;"><strong>💎 Hinweis:</strong> Bonuspunkte werden nach 2 Wochen automatisch gutgeschrieben, um sicherzustellen, dass du mit deinem Kauf zufrieden bist.</p>
              <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
                <p style="margin: 0 0 8px 0; font-weight: bold;">So geht's:</p>
                <ol style="margin: 0; padding-left: 20px;">
                  <li>Gehe zu deiner <strong>Bestellübersicht</strong> (Menü: "Meine Bestellungen")</li>
                  <li>Klicke bei der gelieferten Bestellung auf <strong>"Bewertung abgeben"</strong></li>
                  <li>Gib Sterne-Bewertungen ab (Titel und Kommentar sind optional)</li>
                  <li>Erhalte automatisch <strong>Bonuspunkte</strong> für deine Bewertung!</li>
                </ol>
              </div>
            </div>
            
            <div class="footer">
              <p>Mit freundlichen Grüßen</p>
              <p>Dein 3DarterDE Team</p>
            </div>
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
    console.error('Error sending tracking email:', error);
    return { success: false, error };
  }
}

export async function sendGuestOrderConfirmationEmail({ name, email, orderNumber, items, subtotal, shippingCosts, total, shippingAddress, billingAddress, paymentMethod }: Omit<OrderConfirmationEmailData, 'bonusPointsEarned' | 'pointsRedeemed' | 'pointsDiscount'>) {
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Bestellbestätigung ${orderNumber} - 3DarterDE`,
    headers: {
      'X-Mailer': '3DarterDE System',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
      'X-Report-Abuse': 'Please report abuse to service@3darter.de',
      'Return-Path': process.env.SMTP_FROM || process.env.SMTP_USER,
    } as any,
    text: `Hallo ${name}!\n\nVielen Dank für deine Gastbestellung bei 3DarterDE! 🎯\n\nBestellnummer: ${orderNumber}\n\nBestellte Artikel:\n${items.map((item, index) => {
      const variations = item.variations ? ` (${Object.entries(item.variations).map(([key, value]) => `${key}: ${value}`).join(', ')})` : '';
      return `${index + 1}. ${item.name}${variations}\n   Menge: ${item.quantity}\n   Preis: ${((item.price * item.quantity) / 100).toFixed(2)} €`;
    }).join('\n\n')}\n\nZwischensumme: ${subtotal.toFixed(2)} €\nVersandkosten: ${shippingCosts > 0 ? `${(shippingCosts / 100).toFixed(2)} €` : 'Kostenlos'}\nGesamtbetrag: ${total.toFixed(2)} €\n\nLieferadresse:\n${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}\n${shippingAddress.street} ${shippingAddress.houseNumber}\n${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '\n' : ''}${shippingAddress.postalCode} ${shippingAddress.city}\n${shippingAddress.country}\n\n${billingAddress && billingAddress !== shippingAddress ? `Rechnungsadresse:\n${billingAddress.firstName || ''} ${billingAddress.lastName || ''}\n${billingAddress.street} ${billingAddress.houseNumber}\n${billingAddress.addressLine2 ? billingAddress.addressLine2 + '\n' : ''}${billingAddress.postalCode} ${billingAddress.city}\n${billingAddress.country}\n\n` : ''}Zahlungsmethode: ${paymentMethod === 'card' ? 'Kreditkarte/Debitkarte' : paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'bank' ? 'Banküberweisung' : 'Nicht angegeben'}\n\nWir bearbeiten deine Bestellung so schnell wie möglich und informieren dich über den Versand.\n\nDSGVO-Hinweis: Falls du deine Bestelldaten löschen lassen möchtest, kannst du einen Löschungsantrag stellen: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/guest-data-deletion\nWir werden deine Daten innerhalb von 30 Tagen löschen.\n\nMit freundlichen Grüßen\nDein 3DarterDE Team\n\nBei Fragen erreichst du uns unter: service@3darter.de`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bestellbestätigung - 3DarterDE</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 10px; color: #333; }
          .order-item { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3B82F6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .order-number { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #1d4ed8; }
          .address { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .total { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .dsgvo-notice { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">Hallo ${name}!</h2>
              <img src="${LOGO_BASE64}" alt="3DarterDE Logo" style="max-width: 80px; height: auto;" />
            </div>
            <p>Vielen Dank für deine Gastbestellung bei 3DarterDE! Wir haben deine Bestellung erhalten und bearbeiten sie so schnell wie möglich.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div class="order-number">Bestellnummer: ${orderNumber}</div>
            </div>
            
            <h3>Bestellte Artikel:</h3>
            ${items.map((item, index) => {
              const variations = item.variations ? `<br><small style="color: #6b7280;">${Object.entries(item.variations).map(([key, value]) => `${key}: ${value}`).join(', ')}</small>` : '';
              return `
              <div class="order-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${item.name}</strong>${variations}
                    <br><small>Menge: ${item.quantity}</small>
                  </div>
                  <div style="font-weight: bold; color: #1d4ed8;">
                    ${((item.price * item.quantity) / 100).toFixed(2)} €
                  </div>
                </div>
              </div>
              `;
            }).join('')}
            
            <div class="total">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Zwischensumme:</span>
                <span>${subtotal.toFixed(2)} €</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Versandkosten:</span>
                <span>${shippingCosts > 0 ? `${(shippingCosts / 100).toFixed(2)} €` : 'Kostenlos'}</span>
              </div>
              <hr style="margin: 15px 0; border: none; border-top: 2px solid #3B82F6;">
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
                <span>Gesamtbetrag:</span>
                <span style="color: #1d4ed8;">${total.toFixed(2)} €</span>
              </div>
            </div>
            
            <div class="address">
              <h3 style="margin-top: 0;">Lieferadresse:</h3>
              <p style="margin: 0;">
                ${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}<br>
                ${shippingAddress.street} ${shippingAddress.houseNumber}<br>
                ${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '<br>' : ''}
                ${shippingAddress.postalCode} ${shippingAddress.city}<br>
                ${shippingAddress.country}
              </p>
            </div>
            
            ${billingAddress && billingAddress !== shippingAddress ? `
            <div class="address">
              <h3 style="margin-top: 0;">Rechnungsadresse:</h3>
              <p style="margin: 0;">
                ${billingAddress.firstName || ''} ${billingAddress.lastName || ''}<br>
                ${billingAddress.street} ${billingAddress.houseNumber}<br>
                ${billingAddress.addressLine2 ? billingAddress.addressLine2 + '<br>' : ''}
                ${billingAddress.postalCode} ${billingAddress.city}<br>
                ${billingAddress.country}
              </p>
            </div>
            ` : ''}
            
            <p><strong>Zahlungsmethode:</strong> ${paymentMethod === 'card' ? 'Kreditkarte/Debitkarte' : paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'bank' ? 'Banküberweisung' : 'Nicht angegeben'}</p>
            
            <div class="dsgvo-notice" style="background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 3px solid #6b7280; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                <strong>DSGVO-Hinweis:</strong> Falls du deine Bestelldaten löschen lassen möchtest, kannst du einen 
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/guest-data-deletion" style="color: #1d4ed8; text-decoration: underline;">Löschungsantrag stellen</a>. 
                Wir werden deine Daten innerhalb von 30 Tagen löschen.
              </p>
            </div>
            
            <p>Wir bearbeiten deine Bestellung so schnell wie möglich und informieren dich über den Versand.</p>
            
            <div class="footer">
              <p>Mit freundlichen Grüßen</p>
              <p>Dein 3DarterDE Team</p>
              <p>Bei Fragen erreichst du uns unter: <a href="mailto:service@3darter.de">service@3darter.de</a></p>
            </div>
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
    console.error('Error sending guest order confirmation email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendOrderConfirmationEmail({ name, email, orderNumber, items, subtotal, shippingCosts, total, bonusPointsEarned, pointsRedeemed, pointsDiscount, shippingAddress, billingAddress, paymentMethod }: OrderConfirmationEmailData) {
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Bestellbestätigung ${orderNumber} - 3DarterDE`,
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
    text: `Hallo ${name}!\n\nVielen Dank für deine Bestellung bei 3DarterDE! 🎯\n\nBestellnummer: ${orderNumber}\n\nBestellte Artikel:\n${items.map((item, index) => {
      const variations = item.variations ? ` (${Object.entries(item.variations).map(([key, value]) => `${key}: ${value}`).join(', ')})` : '';
      return `${index + 1}. ${item.name}${variations}\n   Menge: ${item.quantity}\n   Preis: ${((item.price * item.quantity) / 100).toFixed(2)} €`;
    }).join('\n\n')}\n\nZwischensumme: ${subtotal.toFixed(2)} €\nVersandkosten: ${shippingCosts > 0 ? `${(shippingCosts / 100).toFixed(2)} €` : 'Kostenlos'}\n${pointsRedeemed ? `Bonuspunkte-Rabatt: -${pointsDiscount ? (pointsDiscount / 100).toFixed(2) : '0'} €\n` : ''}Gesamtbetrag: ${total.toFixed(2)} €\n\nBonuspunkte verdient: ${bonusPointsEarned} Punkte${pointsRedeemed ? `\nBonuspunkte eingelöst: ${pointsRedeemed} Punkte (${pointsDiscount ? (pointsDiscount / 100).toFixed(2) : '0'} € Rabatt)` : ''}\n\nLieferadresse:\n${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}\n${shippingAddress.street} ${shippingAddress.houseNumber}\n${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '\n' : ''}${shippingAddress.postalCode} ${shippingAddress.city}\n${shippingAddress.country}\n\n${billingAddress && billingAddress !== shippingAddress ? `Rechnungsadresse:\n${billingAddress.firstName || ''} ${billingAddress.lastName || ''}\n${billingAddress.street} ${billingAddress.houseNumber}\n${billingAddress.addressLine2 ? billingAddress.addressLine2 + '\n' : ''}${billingAddress.postalCode} ${billingAddress.city}\n${billingAddress.country}\n\n` : ''}Zahlungsmethode: ${paymentMethod === 'card' ? 'Kreditkarte/Debitkarte' : paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'bank' ? 'Banküberweisung' : 'Nicht angegeben'}\n\nWir bearbeiten deine Bestellung so schnell wie möglich und informieren dich über den Versand.\n\nMit freundlichen Grüßen\nDein 3DarterDE Team\n\nBei Fragen erreichst du uns unter: service@3darter.de`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bestellbestätigung - 3DarterDE</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 10px; color: #333; }
          .order-item { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3B82F6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .order-number { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #1d4ed8; }
          .address { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .total { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .bonus-points { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">Hallo ${name}!</h2>
              <img src="${LOGO_BASE64}" alt="3DarterDE Logo" style="max-width: 80px; height: auto;" />
            </div>
            <p>Vielen Dank für deine Bestellung bei 3DarterDE! Wir haben deine Bestellung erhalten und bearbeiten sie so schnell wie möglich.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div class="order-number">Bestellnummer: ${orderNumber}</div>
            </div>
            
            <h3>Bestellte Artikel:</h3>
            ${items.map((item, index) => {
              const variations = item.variations ? `<div style="font-size: 14px; color: #666; margin-top: 5px;">${Object.entries(item.variations).map(([key, value]) => `<strong>${key}:</strong> ${value}`).join(', ')}</div>` : '';
              return `
                <div class="order-item">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <h4 style="margin: 0 0 10px 0;">${item.name}</h4>
                      ${variations}
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: bold; font-size: 18px;">${((item.price * item.quantity) / 100).toFixed(2)} €</div>
                      <div style="color: #666; font-size: 14px;">${item.quantity} × ${(item.price / 100).toFixed(2)} €</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0;">Bestellübersicht</h3>
              <div style="space-y: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Zwischensumme:</span>
                  <span style="font-weight: bold;">${subtotal.toFixed(2)} €</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Versandkosten:</span>
                  <span style="font-weight: bold; ${shippingCosts > 0 ? 'color: #333;' : 'color: #059669;'}">${shippingCosts > 0 ? `${(shippingCosts / 100).toFixed(2)} €` : 'Kostenlos'}</span>
                </div>
                ${pointsRedeemed ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Bonuspunkte-Rabatt:</span>
                  <span style="font-weight: bold; color: #059669;">-${pointsDiscount ? (pointsDiscount / 100).toFixed(2) : '0'} €</span>
                </div>
                ` : ''}
                <div style="border-top: 2px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: bold; font-size: 18px;">Gesamtbetrag:</span>
                    <span style="font-weight: bold; font-size: 18px; color: #1d4ed8;">${total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bonus-points">
              <h4 style="margin: 0 0 10px 0;">🎁 Bonuspunkte</h4>
              <p style="margin: 0;">Du hast <strong>${bonusPointsEarned} Bonuspunkte</strong> verdient! Diese werden nach der Lieferung deinem Konto gutgeschrieben.</p>
              ${pointsRedeemed ? `<p style="margin: 10px 0 0 0;">Du hast <strong>${pointsRedeemed} Bonuspunkte</strong> eingelöst und <strong>${pointsDiscount ? (pointsDiscount / 100).toFixed(2) : '0'} €</strong> gespart!</p>` : ''}
            </div>
            
            <div class="address">
              <h3 style="margin-top: 0;">Lieferadresse:</h3>
              <p style="margin: 0;">
                ${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}<br>
                ${shippingAddress.street} ${shippingAddress.houseNumber}<br>
                ${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '<br>' : ''}
                ${shippingAddress.postalCode} ${shippingAddress.city}<br>
                ${shippingAddress.country}
              </p>
            </div>
            
            ${billingAddress && billingAddress !== shippingAddress ? `
            <div class="address">
              <h3 style="margin-top: 0;">Rechnungsadresse:</h3>
              <p style="margin: 0;">
                ${billingAddress.firstName || ''} ${billingAddress.lastName || ''}<br>
                ${billingAddress.street} ${billingAddress.houseNumber}<br>
                ${billingAddress.addressLine2 ? billingAddress.addressLine2 + '<br>' : ''}
                ${billingAddress.postalCode} ${billingAddress.city}<br>
                ${billingAddress.country}
              </p>
            </div>
            ` : ''}
            
            <div class="address">
              <h3 style="margin-top: 0;">Zahlungsmethode:</h3>
              <p style="margin: 0;">
                ${paymentMethod === 'card' ? '💳 Kreditkarte/Debitkarte' : 
                  paymentMethod === 'paypal' ? '🅿️ PayPal' : 
                  paymentMethod === 'bank' ? '🏦 Banküberweisung' : 
                  '❓ Nicht angegeben'}
              </p>
            </div>
            
            <p style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <strong>📦 Nächste Schritte:</strong> Wir bearbeiten deine Bestellung so schnell wie möglich und informieren dich per E-Mail über den Versand.
            </p>
            
            <div class="footer">
              <p>Bei Fragen erreichst du uns unter: <a href="mailto:service@3darter.de">service@3darter.de</a></p>
              <p>Dein 3DarterDE Team</p>
            </div>
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
    console.error('Error sending order confirmation email:', error);
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
          .content { background: #f8fafc; padding: 30px; border-radius: 10px; color: #333; }
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">Hallo ${name}!</h2>
              <img src="${LOGO_BASE64}" alt="3DarterDE Logo" style="max-width: 80px; height: auto;" />
            </div>
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
            
            <div class="footer">
              <p>Mit freundlichen Grüßen</p>
              <p>Dein 3DarterDE Team</p>
            </div>
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

export interface ReturnEmailItem {
  name: string;
  quantity: number;
  variations?: Record<string, string>;
}

export async function sendReturnReceivedEmail(params: {
  name?: string;
  email?: string;
  orderNumber: string;
  items: ReturnEmailItem[];
}) {
  const { name, email, orderNumber, items } = params;
  if (!email) return { success: false, error: 'Missing email' };
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Rücksendung eingegangen – Bestellung ${orderNumber}`,
    headers: {
      'X-Mailer': '3DarterDE System',
    } as any,
    text: `Hallo ${name || ''}!

wir haben deine Rücksendeanfrage zu Bestellung ${orderNumber} erhalten.

Artikel:
${items.map(i => `• ${i.name} x${i.quantity}${i.variations ? ` (${Object.entries(i.variations).map(([k,v])=>`${k}: ${v}`).join(', ')})` : ''}`).join('\n')}

Sobald wir die Rücksendung geprüft haben, erhältst du eine Bestätigung und die Rückerstattung wird veranlasst.

Dein 3DarterDE Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rücksendung eingegangen - 3DarterDE</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 10px; color: #333; }
          .return-item { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3B82F6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">Hallo ${name || 'Kunde'}!</h2>
              <img src="${LOGO_BASE64}" alt="3DarterDE Logo" style="max-width: 80px; height: auto;" />
            </div>
            <p>Wir haben deine Rücksendeanfrage zu Bestellung <strong>${orderNumber}</strong> erhalten.</p>
            
            <h3>Zurückgesendete Artikel:</h3>
            ${items.map((item, index) => {
              const variations = item.variations ? `<div style="font-size: 14px; color: #666; margin-top: 5px;">${Object.entries(item.variations).map(([key, value]) => `<strong>${key}:</strong> ${value}`).join(', ')}</div>` : '';
              return `
                <div class="return-item">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <h4 style="margin: 0 0 10px 0;">${item.name}</h4>
                      ${variations}
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: bold; font-size: 18px;">Menge: ${item.quantity}</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
            
            <p style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <strong>📦 Nächste Schritte:</strong> Sobald wir die Rücksendung geprüft haben, erhältst du eine Bestätigung und die Rückerstattung wird veranlasst.
            </p>
            
            <div class="footer">
              <p>Mit freundlichen Grüßen</p>
              <p>Dein 3DarterDE Team</p>
            </div>
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
    console.error('Error sending return received email:', error);
    return { success: false, error };
  }
}

export async function sendReturnCompletedEmail(params: {
  name?: string;
  email?: string;
  orderNumber: string;
  acceptedItems: ReturnEmailItem[];
  rejectedItems?: ReturnEmailItem[];
}) {
  const { name, email, orderNumber, acceptedItems, rejectedItems } = params;
  if (!email) return { success: false, error: 'Missing email' };
  const mailOptions: SendMailOptions = {
    from: `"3DarterDE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Rücksendung abgeschlossen – Bestellung ${orderNumber}`,
    headers: {
      'X-Mailer': '3DarterDE System',
    } as any,
    text: `Hallo ${name || ''}!

deine Rücksendung zu Bestellung ${orderNumber} wurde geprüft.

Akzeptiert:
${acceptedItems.map(i => `• ${i.name} x${i.quantity}${i.variations ? ` (${Object.entries(i.variations).map(([k,v])=>`${k}: ${v}`).join(', ')})` : ''}`).join('\n')}
${(rejectedItems && rejectedItems.length) ? `\nNicht akzeptiert:\n${rejectedItems.map(i => `• ${i.name} x${i.quantity}${i.variations ? ` (${Object.entries(i.variations).map(([k,v])=>`${k}: ${v}`).join(', ')})` : ''}`).join('\n')}` : ''}

Die Rückerstattung für die akzeptierten Artikel wird jetzt veranlasst.

📄 Storno-Rechnung: Du kannst die Storno-Rechnung für diese Rücksendung in deinem Profil unter "Meine Bestellungen" herunterladen.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rücksendung abgeschlossen - 3DarterDE</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 10px; color: #333; }
          .return-item { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3B82F6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .accepted-item { border-left-color: #10b981; }
          .rejected-item { border-left-color: #ef4444; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">Hallo ${name || 'Kunde'}!</h2>
              <img src="${LOGO_BASE64}" alt="3DarterDE Logo" style="max-width: 80px; height: auto;" />
            </div>
            <p>Deine Rücksendung zu Bestellung <strong>${orderNumber}</strong> wurde geprüft.</p>
            
            <h3>✅ Akzeptierte Artikel:</h3>
            ${acceptedItems.map((item, index) => {
              const variations = item.variations ? `<div style="font-size: 14px; color: #666; margin-top: 5px;">${Object.entries(item.variations).map(([key, value]) => `<strong>${key}:</strong> ${value}`).join(', ')}</div>` : '';
              return `
                <div class="return-item accepted-item">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <h4 style="margin: 0 0 10px 0;">${item.name}</h4>
                      ${variations}
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: bold; font-size: 18px; color: #10b981;">Menge: ${item.quantity}</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
            
            ${rejectedItems && rejectedItems.length > 0 ? `
            <h3>❌ Nicht akzeptierte Artikel:</h3>
            ${rejectedItems.map((item, index) => {
              const variations = item.variations ? `<div style="font-size: 14px; color: #666; margin-top: 5px;">${Object.entries(item.variations).map(([key, value]) => `<strong>${key}:</strong> ${value}`).join(', ')}</div>` : '';
              return `
                <div class="return-item rejected-item">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <h4 style="margin: 0 0 10px 0;">${item.name}</h4>
                      ${variations}
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: bold; font-size: 18px; color: #ef4444;">Menge: ${item.quantity}</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
            ` : ''}
            
            <p style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <strong>💰 Rückerstattung:</strong> Die Rückerstattung für die akzeptierten Artikel wird jetzt veranlasst.
            </p>
            
            <p style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <strong>📄 Storno-Rechnung:</strong> Du kannst die Storno-Rechnung für diese Rücksendung in deinem Profil unter "Meine Bestellungen" herunterladen.
            </p>
            
            <div class="footer">
              <p>Mit freundlichen Grüßen</p>
              <p>Dein 3DarterDE Team</p>
            </div>
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
    console.error('Error sending return completed email:', error);
    return { success: false, error };
  }
}

