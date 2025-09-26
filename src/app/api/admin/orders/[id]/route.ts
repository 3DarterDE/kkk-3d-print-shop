import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { AdminBonusPoints } from '@/lib/models/AdminBonusPoints';

export async function PATCH(
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
    const { status, trackingNumber, shippingProvider } = body;

    if (!status && !trackingNumber && !shippingProvider) {
      return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };

    if (status) {
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber;
    }

    if (shippingProvider) {
      const validProviders = ['dhl', 'dpd', 'ups', 'fedex', 'hermes', 'gls', 'other'];
      if (!validProviders.includes(shippingProvider)) {
        return NextResponse.json({ error: 'Invalid shipping provider' }, { status: 400 });
      }
      updateData.shippingProvider = shippingProvider;
    }

    await connectToDatabase();

    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If status is being changed to 'delivered', create automatic bonus points timer
    if (status === 'delivered' && order.bonusPointsEarned > 0 && !order.bonusPointsCredited && !order.bonusPointsScheduledAt) {
      try {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 14); // 2 weeks

        const adminBonusPoints = new AdminBonusPoints({
          userId: order.userId,
          orderId: (order._id as any).toString(),
          pointsAwarded: order.bonusPointsEarned,
          reason: 'Automatische Bonuspunkte nach Lieferung',
          awardedBy: (user as any)._id.toString(),
          bonusPointsCredited: false,
          bonusPointsScheduledAt: scheduledDate
        });

        await adminBonusPoints.save();

        // Update the order to mark as scheduled
        order.bonusPointsScheduledAt = scheduledDate;
        await order.save();

        console.log(`Automatic bonus points timer created for order ${order.orderNumber}: ${order.bonusPointsEarned} points scheduled for ${scheduledDate.toISOString()}`);
      } catch (error) {
        console.error('Error creating automatic bonus points timer:', error);
        // Don't fail the status update if bonus points timer creation fails
      }
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
