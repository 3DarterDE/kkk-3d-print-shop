import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import ReturnRequest from '@/lib/models/Return';
import { sendReturnReceivedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response;

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

    const order = await Order.findById(orderId).lean();
    if (!order || order.userId !== user._id.toString()) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    if (order.status !== 'shipped') {
      return NextResponse.json({ error: 'Rücksendeanfrage ist nur für versandte Bestellungen möglich' }, { status: 400 });
    }

    // 30-tage nach Versand (wir nutzen createdAt als Fallback, falls shippedAt fehlt)
    const shippedAt: Date = (order.updatedAt && order.status === 'shipped') ? new Date(order.updatedAt) : new Date(order.createdAt);
    const now = new Date();
    const daysSinceShipped = Math.floor((now.getTime() - shippedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceShipped > 30) {
      return NextResponse.json({ error: 'Rücksendung nur innerhalb von 30 Tagen nach Versand' }, { status: 400 });
    }

    // Map requested items to order items to capture full data (name, image, price, variations)
    // Build a lookup that considers productId + variations signature
    const signature = (it: any) => `${it.productId}|${it.variations ? Object.entries(it.variations).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`).join(',') : ''}`;
    const orderItemMap = new Map(order.items.map((it: any) => [signature(it), it]));

    const normalizedItems = [] as any[];
    for (const reqItem of items) {
      const key = signature(reqItem);
      const orderItem = orderItemMap.get(key);
      if (!orderItem) continue;
      const maxQty = orderItem.quantity;
      const qty = Math.max(0, Math.min(Number(reqItem.quantity) || 0, maxQty));
      if (qty <= 0) continue;
      normalizedItems.push({
        productId: orderItem.productId,
        name: orderItem.name,
        price: orderItem.price,
        quantity: qty,
        image: orderItem.image,
        variations: orderItem.variations || undefined,
        accepted: false,
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
        name: user.name,
        email: user.email,
      },
      items: normalizedItems,
      status: 'received',
      notes: typeof notes === 'string' ? notes : undefined,
    });

    await returnRequest.save();

    // Update order status -> return_requested
    await Order.findByIdAndUpdate(order._id, { $set: { status: 'return_requested' } });

    // Send confirmation email to customer
    try {
      await sendReturnReceivedEmail({
        name: user.name,
        email: user.email,
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


