import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import ReturnRequest from '@/lib/models/Return';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    await connectToDatabase();

    // Count pending orders (new orders that need attention)
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['pending', 'processing'] }
    });

    // Count pending returns (new return requests)
    const pendingReturns = await ReturnRequest.countDocuments({
      status: { $in: ['received', 'processing'] }
    });

    return NextResponse.json({
      success: true,
      data: {
        pendingOrders,
        pendingReturns
      }
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
