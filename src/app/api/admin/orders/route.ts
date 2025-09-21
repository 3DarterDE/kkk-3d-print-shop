import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    await connectToDatabase();

    // Build query
    let query: any = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Fetch orders with user information first
    let orders;
    if (search) {
      // If searching, we need to find users first, then orders
      const userQuery = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ]
      };
      
      const matchingUsers = await User.find(userQuery, '_id').lean();
      const userIds = matchingUsers.map(user => user._id.toString());
      
      // Add user search to order query
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.street': { $regex: search, $options: 'i' } },
        { 'shippingAddress.city': { $regex: search, $options: 'i' } },
        { 'trackingNumber': { $regex: search, $options: 'i' } },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : [])
      ];
    }

    orders = await Order.find(query)
      .populate('userId', 'email firstName lastName', User)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Format orders with user information
    const formattedOrders = orders.map(order => ({
      ...order,
      userEmail: order.userId?.email || 'Unbekannt',
      userName: order.userId ? 
        `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || 'Unbekannt' : 
        'Unbekannt'
    }));

    return NextResponse.json({
      orders: formattedOrders,
      total,
      page,
      limit
    });

  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
