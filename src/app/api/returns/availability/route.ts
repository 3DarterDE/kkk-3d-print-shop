import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import ReturnRequest from '@/lib/models/Return';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId ist erforderlich' }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findById(orderId).lean();
    if (!order || order.userId !== user._id.toString()) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    // Get all return requests for this order
    const returnRequests = await ReturnRequest.find({ orderId: order._id.toString() }).lean();

    // Calculate availability for each item
    const itemAvailability = order.items.map(orderItem => {
      let alreadyReturnedQty = 0;
      let alreadyRequestedQty = 0;

      // Count completed returns
      returnRequests.forEach(returnRequest => {
        if (returnRequest.status === 'completed') {
          returnRequest.items.forEach(returnItem => {
            if (returnItem.productId === orderItem.productId &&
                returnItem.accepted &&
                JSON.stringify(returnItem.variations || {}) === JSON.stringify(orderItem.variations || {})) {
              alreadyReturnedQty += returnItem.quantity;
            }
          });
        } else if (returnRequest.status === 'received' || returnRequest.status === 'processing') {
          // Count pending returns
          returnRequest.items.forEach(returnItem => {
            if (returnItem.productId === orderItem.productId &&
                JSON.stringify(returnItem.variations || {}) === JSON.stringify(orderItem.variations || {})) {
              alreadyRequestedQty += returnItem.quantity;
            }
          });
        }
      });

      const availableQty = orderItem.quantity - alreadyReturnedQty - alreadyRequestedQty;

      return {
        productId: orderItem.productId,
        name: orderItem.name,
        originalQuantity: orderItem.quantity,
        alreadyReturnedQty,
        alreadyRequestedQty,
        availableQty: Math.max(0, availableQty),
        isAvailable: availableQty > 0
      };
    });

    return NextResponse.json({ 
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      itemAvailability 
    });

  } catch (error) {
    console.error('Error getting return availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
