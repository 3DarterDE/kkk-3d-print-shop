import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trackingId: string }> }
) {
  try {
    const { user, response } = await requireUser();
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, trackingId } = await params;

    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Remove tracking info by ID
    const beforeCount = order.trackingInfo.length;
    order.trackingInfo = order.trackingInfo.filter(
      (tracking: any) => {
        const trackingIdStr = tracking._id ? tracking._id.toString() : '';
        return trackingIdStr !== trackingId;
      }
    );
    
    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Tracking info removed successfully'
    });

  } catch (error) {
    console.error('Error removing tracking info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
