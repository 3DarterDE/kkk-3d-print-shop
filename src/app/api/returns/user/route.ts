import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ReturnRequest from '@/lib/models/Return';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;

    await connectToDatabase();

    // Get all return requests for the user
    const returnRequests = await ReturnRequest.find({ 
      userId: user._id.toString(),
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
