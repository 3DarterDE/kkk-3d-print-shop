import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import ReturnRequest from '@/lib/models/Return';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const orderIdsParam = searchParams.get('orderIds');

    if (!orderIdsParam) {
      return NextResponse.json({ error: 'orderIds parameter erforderlich' }, { status: 400 });
    }

    const orderIds = orderIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    
    if (orderIds.length === 0) {
      return NextResponse.json({ pendingReturnsByOrder: {} });
    }

    await connectToDatabase();

    // Get all pending returns for these orders in one query
    const pendingReturns = await ReturnRequest.find({
      orderId: { $in: orderIds },
      status: { $in: ['received', 'processing'] }
    }).lean();

    // Group by orderId
    const pendingReturnsByOrder: Record<string, Record<string, number>> = {};

    pendingReturns.forEach(returnDoc => {
      const orderId = returnDoc.orderId;
      if (!pendingReturnsByOrder[orderId]) {
        pendingReturnsByOrder[orderId] = {};
      }

      returnDoc.items.forEach((item: any) => {
        const signature = `${item.productId}|${item.variations ? Object.entries(item.variations).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`).join(',') : ''}`;
        const currentQty = pendingReturnsByOrder[orderId][signature] || 0;
        pendingReturnsByOrder[orderId][signature] = currentQty + item.quantity;
      });
    });

    const result = NextResponse.json({ pendingReturnsByOrder });
    
    // Cache for 5 seconds
    result.headers.set('Cache-Control', 'private, max-age=5');
    
    return result;
  } catch (error) {
    console.error('Error fetching batch pending returns:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
