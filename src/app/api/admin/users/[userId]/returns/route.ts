import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ReturnRequest from '@/lib/models/Return';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;

    await connectToDatabase();
    const { userId } = await params;

    // Get all return requests for the specific user
    const returnRequests = await ReturnRequest.find({ 
      userId: userId,
      status: { $in: ['completed'] } // Only completed returns
    }).lean();

    // Group returned items by order
    const returnedItemsByOrder: Record<string, any[]> = {};
    
    returnRequests.forEach(returnRequest => {
      const orderId = returnRequest.orderId;
      if (!returnedItemsByOrder[orderId]) {
        returnedItemsByOrder[orderId] = [];
      }
      
      // Add accepted items to the list
      returnRequest.items.forEach((item: any) => {
        if (item.accepted) {
          returnedItemsByOrder[orderId].push({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            variations: item.variations,
            returnRequestId: returnRequest._id,
            returnDate: returnRequest.updatedAt
          });
        }
      });
    });

    return NextResponse.json({ returnedItemsByOrder });
  } catch (error) {
    console.error('Error fetching user returns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
