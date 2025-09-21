import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

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
    const body = await request.json();
    const { trackingNumber, shippingProvider, notes } = body;

    if (!trackingNumber || !shippingProvider) {
      return NextResponse.json({ error: 'Tracking number and shipping provider are required' }, { status: 400 });
    }

    const validProviders = ['dhl', 'dpd', 'ups', 'fedex', 'hermes', 'gls', 'other'];
    if (!validProviders.includes(shippingProvider)) {
      return NextResponse.json({ error: 'Invalid shipping provider' }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Initialize trackingInfo array if it doesn't exist
    if (!order.trackingInfo) {
      order.trackingInfo = [];
    }

    // Check if trackingInfo is an array, if not initialize it
    if (!Array.isArray(order.trackingInfo)) {
      order.trackingInfo = [];
    }

    // Add new tracking info
    const newTrackingInfo = {
      trackingNumber,
      shippingProvider,
      addedAt: new Date(),
      notes: notes || ''
    };

    order.trackingInfo.push(newTrackingInfo);
    await order.save();

    // Get the saved tracking info with the generated _id
    const savedOrder = await Order.findById(id);
    const savedTrackingInfo = savedOrder.trackingInfo[savedOrder.trackingInfo.length - 1];

    return NextResponse.json({
      success: true,
      trackingInfo: savedTrackingInfo,
      message: 'Tracking info added successfully'
    });

  } catch (error) {
    console.error('Error adding tracking info:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
