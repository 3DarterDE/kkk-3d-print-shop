import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import Order from '@/lib/models/Order';
import { auth0 } from '@/lib/auth0';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await cookies();
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    await connectToDatabase();
    const currentUser = await User.findOne({ auth0Id: session.user.sub });
    
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    // Get user details
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's orders
    const orders = await Order.find({ userId: user._id.toString() })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate order statistics
    const orderStats = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
      lastOrderDate: orders.length > 0 ? orders[0].createdAt : null
    };

    // Remove sensitive data
    const { auth0Id, ...userData } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        orders,
        orderStats
      }
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}