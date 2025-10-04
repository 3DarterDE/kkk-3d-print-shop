import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, orderNumber, reason, customerName } = await request.json();

    if (!email || !orderNumber) {
      return NextResponse.json({ 
        error: 'Email and order number are required' 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Verify the guest order exists
    const order = await Order.findOne({ 
      orderNumber: orderNumber,
      guestEmail: email.toLowerCase(),
      userId: null // Ensure it's a guest order
    });

    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found or not a guest order' 
      }, { status: 404 });
    }

    // Send email to admin about the deletion request
    try {
      await sendEmail({
        to: 'service@3darter.de',
        subject: `DSGVO Datenlöschung beantragt - Bestellung ${orderNumber}`,
        text: `Ein Kunde hat die Löschung seiner Gastbestellungsdaten beantragt:

Kundeninformationen:
- Name: ${customerName || 'Nicht angegeben'}
- E-Mail: ${email}
- Bestellnummer: ${orderNumber}

Grund für die Löschung:
${reason || 'Kein Grund angegeben'}

Bestelldetails:
- Datum: ${order.createdAt}
- Status: ${order.status}
- Gesamtbetrag: ${order.total} €

Bitte loggen Sie sich ins Admin-Panel ein und löschen Sie die Daten für Bestellung ${orderNumber}.

Admin-Panel: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/orders`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1d4ed8;">DSGVO Datenlöschung beantragt</h2>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Kundeninformationen:</h3>
              <p><strong>Name:</strong> ${customerName || 'Nicht angegeben'}</p>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Bestellnummer:</strong> ${orderNumber}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Grund für die Löschung:</h3>
              <p>${reason || 'Kein Grund angegeben'}</p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Bestelldetails:</h3>
              <p><strong>Datum:</strong> ${new Date(order.createdAt).toLocaleDateString('de-DE')}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Gesamtbetrag:</strong> ${order.total} €</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/orders" 
                 style="background: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Admin-Panel öffnen
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Bitte loggen Sie sich ins Admin-Panel ein und löschen Sie die Daten für Bestellung ${orderNumber}.
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send deletion request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Ihr Löschungsantrag wurde erfolgreich übermittelt. Wir werden Ihre Daten innerhalb von 30 Tagen löschen.'
    });

  } catch (error) {
    console.error('Error processing guest data deletion request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
