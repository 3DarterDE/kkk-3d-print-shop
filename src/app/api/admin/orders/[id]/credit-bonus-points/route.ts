import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { AdminBonusPoints } from '@/lib/models/AdminBonusPoints';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response, user: adminUser } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    const { reason } = await request.json();
    
    await connectToDatabase();

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    // Check if points are already credited
    if (order.bonusPointsCredited) {
      return NextResponse.json({ error: 'Bonuspunkte wurden bereits gutgeschrieben' }, { status: 400 });
    }

    // Find the user
    const user = await User.findById(order.userId);
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const bonusPoints = order.bonusPointsEarned || 0;
    
    // Create admin bonus points timer (2 weeks)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 14); // 2 weeks

    const adminBonusPoints = new AdminBonusPoints({
      userId: order.userId,
      orderId: (order._id as any).toString(),
      pointsAwarded: bonusPoints,
      reason: reason || 'Admin-Bonuspunkte für Bestellung',
      awardedBy: (adminUser as any)._id.toString(),
      bonusPointsCredited: false,
      bonusPointsScheduledAt: scheduledDate
    });

    await adminBonusPoints.save();

    // Update the order to mark as "scheduled" (not credited yet)
    order.bonusPointsCredited = false; // Keep as false since it's scheduled
    await order.save();

    return NextResponse.json({
      success: true,
      message: `${bonusPoints} Bonuspunkte wurden für die Gutschrift nach 2 Wochen eingeplant`,
      bonusPointsScheduled: bonusPoints,
      scheduledDate: scheduledDate,
      timerId: adminBonusPoints._id
    });

  } catch (error) {
    console.error('Error scheduling bonus points:', error);
    return NextResponse.json(
      { error: 'Fehler beim Einplanen der Bonuspunkte' },
      { status: 500 }
    );
  }
}
