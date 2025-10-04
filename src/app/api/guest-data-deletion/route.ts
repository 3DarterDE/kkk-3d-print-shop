import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function POST(request: NextRequest) {
  try {
    const { email, orderNumber, reason } = await request.json();

    if (!email || !orderNumber) {
      return NextResponse.json({ 
        error: 'Email and order number are required' 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Find the guest order
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
          notes: `DSGVO deletion requested: ${reason || 'No reason provided'}`
        }
      }
    );

    return NextResponse.json({ 
      success: true,
      message: 'Guest order data has been anonymized according to DSGVO requirements'
    });

  } catch (error) {
    console.error('Error processing guest data deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
