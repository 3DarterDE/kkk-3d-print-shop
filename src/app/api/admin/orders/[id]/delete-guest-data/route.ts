import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireUser();
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if it's a guest order
    if (order.userId !== null) {
      return NextResponse.json({ error: 'This is not a guest order' }, { status: 400 });
    }

    if (!order.guestEmail) {
      return NextResponse.json({ error: 'No guest email found' }, { status: 400 });
    }

    // Anonymize guest order data (DSGVO compliant)
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          guestEmail: 'geloescht@geloescht.de',
          guestName: 'Gelöscht',
          'shippingAddress.firstName': 'Gelöscht',
          'shippingAddress.lastName': 'Gelöscht',
          'shippingAddress.street': 'Gelöscht',
          'shippingAddress.houseNumber': '0',
          'shippingAddress.addressLine2': '',
          'shippingAddress.city': 'Gelöscht',
          'shippingAddress.postalCode': '00000',
          'shippingAddress.country': 'DE',
          'billingAddress.firstName': 'Gelöscht',
          'billingAddress.lastName': 'Gelöscht',
          'billingAddress.street': 'Gelöscht',
          'billingAddress.houseNumber': '0',
          'billingAddress.addressLine2': '',
          'billingAddress.city': 'Gelöscht',
          'billingAddress.postalCode': '00000',
          'billingAddress.country': 'DE',
          notes: `DSGVO deletion completed by admin on ${new Date().toISOString()}`
        }
      }
    );

    // Send confirmation email to customer (if original email is still available)
    try {
      const originalEmail = order.guestEmail;
      await sendEmail({
        to: originalEmail,
        subject: `Datenlöschung abgeschlossen - Bestellung ${order.orderNumber}`,
        text: `Sehr geehrte Damen und Herren,

Ihr Antrag auf Datenlöschung wurde bearbeitet.

Bestellnummer: ${order.orderNumber}

Ihre persönlichen Daten wurden gemäß DSGVO-Anforderungen gelöscht/anonymisiert.

Die Löschung wurde am ${new Date().toLocaleDateString('de-DE')} durchgeführt.

Mit freundlichen Grüßen
Ihr 3DarterDE Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1d4ed8;">Datenlöschung abgeschlossen</h2>
            
            <p>Sehr geehrte Damen und Herren,</p>
            
            <p>Ihr Antrag auf Datenlöschung wurde bearbeitet.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Bestellnummer: ${order.orderNumber}</h3>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Durchgeführte Maßnahmen:</h3>
              <p>Ihre persönlichen Daten wurden gemäß DSGVO-Anforderungen gelöscht/anonymisiert.</p>
            </div>
            
            <p>Die Löschung wurde am <strong>${new Date().toLocaleDateString('de-DE')}</strong> durchgeführt.</p>
            
            <p>Mit freundlichen Grüßen<br>Ihr 3DarterDE Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send deletion confirmation email:', emailError);
      // Don't fail the deletion if email fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Guest order data has been anonymized successfully'
    });

  } catch (error) {
    console.error('Error deleting guest order data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
