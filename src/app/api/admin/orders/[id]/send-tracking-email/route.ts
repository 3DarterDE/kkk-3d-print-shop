import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { sendTrackingEmail } from '@/lib/email';

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

    const order = await Order.findById(id).populate('userId', 'email firstName lastName', User);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.trackingInfo || order.trackingInfo.length === 0) {
      return NextResponse.json({ error: 'No tracking information available' }, { status: 400 });
    }

    // Handle both regular users and guest orders
    let userName: string;
    let userEmail: string;

    if (order.userId) {
      // Regular user order
      const userData = order.userId as any;
      userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Kunde';
      userEmail = userData.email;

      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }
    } else if (order.guestEmail && order.guestName) {
      // Guest order
      userName = order.guestName;
      userEmail = order.guestEmail;
    } else {
      return NextResponse.json({ error: 'No user or guest information found' }, { status: 404 });
    }

    // Send tracking email
    const emailResult = await sendTrackingEmail({
      name: userName,
      email: userEmail,
      orderNumber: order.orderNumber,
      trackingInfo: order.trackingInfo.map(tracking => ({
        trackingNumber: tracking.trackingNumber,
        shippingProvider: tracking.shippingProvider,
        notes: tracking.notes
      })),
      shippingAddress: order.shippingAddress
    });

    if (!emailResult.success) {
      console.error('Failed to send tracking email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update order status to 'shipped' and mark tracking info as email sent
    const now = new Date();
    const updatedTrackingInfo = order.trackingInfo.map(tracking => ({
      ...tracking.toObject(),
      emailSent: true,
      emailSentAt: now
    }));

    await Order.findByIdAndUpdate(id, {
      status: 'shipped',
      trackingInfo: updatedTrackingInfo,
      isEmailSent: true,
      emailSentAt: now
    });

    return NextResponse.json({
      success: true,
      message: 'Tracking email sent successfully and order status updated to shipped'
    });

  } catch (error) {
    console.error('Error sending tracking email:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
