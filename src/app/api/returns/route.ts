import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import ReturnRequest from '@/lib/models/Return';
import User from '@/lib/models/User';
import { sendReturnReceivedEmail } from '@/lib/email';
import { freezeBonusPointsForReturn, calculateItemBonusPoints } from '@/lib/return-bonus-points';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;

    const body = await request.json();
    const { orderId, items, notes } = body as {
      orderId: string;
      items: Array<{ productId: string; quantity: number; variations?: Record<string, string> }>;
      notes?: string;
    };

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'orderId und items sind erforderlich' }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch user data to get firstName and lastName
    const userData = await User.findById(user._id.toString());
    if (!userData) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const order = await Order.findById(orderId).lean();
    if (!order || order.userId !== user._id.toString()) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    if (order.status !== 'delivered' && order.status !== 'partially_returned' && order.status !== 'return_requested') {
      return NextResponse.json({ error: 'Rücksendeanfrage ist nur für gelieferte oder teilweise zurückgesendete Bestellungen möglich' }, { status: 400 });
    }

    // 30-tage nach Lieferung
    const deliveredAt: Date = (order.updatedAt && order.status === 'delivered') 
      ? new Date(order.updatedAt) 
      : new Date(order.createdAt);
    const now = new Date();
    const daysSinceDelivered = Math.floor((now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivered > 30) {
      return NextResponse.json({ error: 'Rücksendung nur innerhalb von 30 Tagen nach Lieferung' }, { status: 400 });
    }

    // Get all previously returned items for this order
    const previousReturns = await ReturnRequest.find({ 
      orderId: order._id.toString(), 
      status: { $in: ['completed', 'received', 'processing'] }
    }).lean();
    
    // Calculate already returned quantities per item
    const alreadyReturnedMap = new Map<string, number>();
    const alreadyRequestedMap = new Map<string, number>();
    
    previousReturns.forEach(returnDoc => {
      returnDoc.items.forEach((item: any) => {
        const signature = `${item.productId}|${item.variations ? Object.entries(item.variations).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`).join(',') : ''}`;
        
        if (returnDoc.status === 'completed' && item.accepted) {
          // Already completed and accepted
          const currentQty = alreadyReturnedMap.get(signature) || 0;
          alreadyReturnedMap.set(signature, currentQty + item.quantity);
        } else if (returnDoc.status === 'received' || returnDoc.status === 'processing') {
          // Already requested but not yet processed
          const currentQty = alreadyRequestedMap.get(signature) || 0;
          alreadyRequestedMap.set(signature, currentQty + item.quantity);
        }
      });
    });

    // Map requested items to order items to capture full data (name, image, price, variations)
    // Build a lookup that considers productId + variations signature
    const signature = (it: any) => `${it.productId}|${it.variations ? Object.entries(it.variations).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`).join(',') : ''}`;
    const orderItemMap = new Map(order.items.map((it: any) => [signature(it), it]));

    const normalizedItems = [] as any[];
    for (const reqItem of items) {
      const key = signature(reqItem);
      const orderItem = orderItemMap.get(key);
      if (!orderItem) continue;
      
      // Calculate available quantity (original - already returned - already requested)
      const alreadyReturned = alreadyReturnedMap.get(key) || 0;
      const alreadyRequested = alreadyRequestedMap.get(key) || 0;
      const availableQty = orderItem.quantity - alreadyReturned - alreadyRequested;
      
      if (availableQty <= 0) continue; // Item already fully returned or requested
      
      const qty = Math.max(0, Math.min(Number(reqItem.quantity) || 0, availableQty));
      if (qty <= 0) continue;
      
      // Calculate frozen bonus points for this item
      const frozenBonusPoints = calculateItemBonusPoints(orderItem.price) * qty;
      
      normalizedItems.push({
        productId: orderItem.productId,
        name: orderItem.name,
        price: orderItem.price,
        quantity: qty,
        image: orderItem.image,
        variations: orderItem.variations || undefined,
        accepted: false,
        frozenBonusPoints: frozenBonusPoints,
        refundPercentage: 100,
        notReturned: false,
      });
    }

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Artikel für Rücksendung' }, { status: 400 });
    }

    const returnRequest = new ReturnRequest({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: user._id.toString(),
      customer: {
        name: userData.firstName && userData.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : userData.name || 'Kunde',
        email: userData.email,
      },
      items: normalizedItems,
      status: 'received',
      notes: typeof notes === 'string' ? notes : undefined,
      timerPausedAt: new Date(),
    });

    await returnRequest.save();

    // Freeze bonus points for this return
    try {
      await freezeBonusPointsForReturn(
        order._id.toString(),
        normalizedItems,
        (returnRequest._id as any).toString()
      );
      console.log(`Bonuspunkte eingefroren für Rücksendung ${returnRequest._id}`);
    } catch (freezeError) {
      console.error('Fehler beim Einfrieren der Bonuspunkte:', freezeError);
      // Don't fail the return request if bonus points freezing fails
    }

    // Update order status -> return_requested (only if not already partially_returned)
    if (order.status !== 'partially_returned') {
      await Order.findByIdAndUpdate(order._id, { $set: { status: 'return_requested' } });
    }

    // Send confirmation email to customer
    try {
      const customerName = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : userData.name || 'Kunde';
      
      await sendReturnReceivedEmail({
        name: customerName,
        email: userData.email,
        orderNumber: order.orderNumber,
        items: normalizedItems.map((it: any) => ({ name: it.name, quantity: it.quantity, variations: it.variations })),
      });
    } catch (e) {
      console.warn('Return received email failed:', e);
    }

    return NextResponse.json({ success: true, returnRequest });
  } catch (error) {
    console.error('Error creating return request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


