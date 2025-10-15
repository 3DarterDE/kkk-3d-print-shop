import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import ReturnRequest from '@/lib/models/Return';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID erforderlich' }, { status: 400 });
    }

    // Get all pending/requested returns for this order
    const pendingReturns = await ReturnRequest.find({
      orderId: orderId,
      status: { $in: ['received', 'processing'] }
    }).lean();

    // Calculate already requested quantities per item
    const alreadyRequestedMap = new Map<string, number>();
    
    pendingReturns.forEach(returnDoc => {
      returnDoc.items.forEach((item: any) => {
        const signature = `${item.productId}|${item.variations ? Object.entries(item.variations).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`).join(',') : ''}`;
        const currentQty = alreadyRequestedMap.get(signature) || 0;
        alreadyRequestedMap.set(signature, currentQty + item.quantity);
      });
    });

    // Convert map to object for easier frontend consumption
    const alreadyRequested = Object.fromEntries(alreadyRequestedMap);

    return NextResponse.json({ alreadyRequested });
  } catch (error) {
    console.error('Error fetching pending returns:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
