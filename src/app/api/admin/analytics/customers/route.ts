import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const matchStage: any = {
      status: { $nin: ['cancelled'] }
    };
    
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    // Get previous period dates for comparison
    let prevMatchStage: any = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = end.getTime() - start.getTime();
      
      const prevStart = new Date(start.getTime() - duration);
      const prevEnd = new Date(start.getTime());
      
      prevMatchStage = {
        status: { $nin: ['cancelled'] },
        createdAt: { $gte: prevStart, $lt: prevEnd }
      };
    }

    // Main statistics
    const [
      customerStats,
      topCustomers,
      newVsReturningCustomers,
      customerTrendData,
      prevCustomerStats
    ] = await Promise.all([
      // Overall customer statistics
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            uniqueCustomers: { $addToSet: '$userId' },
            guestOrders: { $sum: { $cond: [{ $eq: ['$userId', null] }, 1, 0] } },
            registeredOrders: { $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] } },
            totalRevenue: { $sum: '$total' }
          }
        },
        {
          $project: {
            totalOrders: 1,
            uniqueCustomers: { $size: '$uniqueCustomers' },
            guestOrders: 1,
            registeredOrders: 1,
            totalRevenue: 1,
            avgOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] }
          }
        }
      ]),

      // Top customers by revenue - simplified approach
      (async () => {
        const orders = await Order.find({ 
          ...matchStage, 
          userId: { $ne: null } 
        }).lean();
        
        const customerMap = new Map();
        
        for (const order of orders) {
          const userId = order.userId;
          if (!customerMap.has(userId)) {
            customerMap.set(userId, {
              userId,
              totalRevenue: 0,
              totalOrders: 0,
              lastOrderDate: order.createdAt
            });
          }
          
          const customer = customerMap.get(userId);
          customer.totalRevenue += order.total;
          customer.totalOrders += 1;
          if (order.createdAt > customer.lastOrderDate) {
            customer.lastOrderDate = order.createdAt;
          }
        }
        
        // Get user details for each customer
        const userIds = Array.from(customerMap.keys());
        const users = await User.find({ _id: { $in: userIds } }).lean();
        const userMap = new Map(users.map(user => [user._id.toString(), user]));
        
        const topCustomers = Array.from(customerMap.values())
          .map(customer => {
            const user = userMap.get(customer.userId);
            return {
              customerName: user ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name) : 'Unbekannt',
              customerEmail: user ? user.email : 'Unbekannt',
              totalRevenue: customer.totalRevenue,
              totalOrders: customer.totalOrders,
              avgOrderValue: customer.totalRevenue / customer.totalOrders,
              lastOrderDate: customer.lastOrderDate
            };
          })
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 10);
        
        return topCustomers;
      })(),

      // Guest vs Customer orders analysis
      (async () => {
        const guestOrders = await Order.find({ 
          ...matchStage, 
          userId: null 
        }).lean();
        
        const customerOrders = await Order.find({ 
          ...matchStage, 
          userId: { $ne: null } 
        }).lean();
        
        return {
          guest: {
            count: guestOrders.length,
            totalRevenue: guestOrders.reduce((sum, order) => sum + order.total, 0),
            avgRevenue: guestOrders.length > 0 ? guestOrders.reduce((sum, order) => sum + order.total, 0) / guestOrders.length : 0
          },
          customer: {
            count: customerOrders.length,
            totalRevenue: customerOrders.reduce((sum, order) => sum + order.total, 0),
            avgRevenue: customerOrders.length > 0 ? customerOrders.reduce((sum, order) => sum + order.total, 0) / customerOrders.length : 0
          }
        };
      })(),

      // Customer registration trend
      User.aggregate([
        { $match: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {} },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            newCustomers: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 100 }
      ]),

      // Previous period stats for comparison
      prevMatchStage ? Order.aggregate([
        { $match: prevMatchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            uniqueCustomers: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            totalOrders: 1,
            uniqueCustomers: { $size: '$uniqueCustomers' }
          }
        }
      ]) : Promise.resolve([])
    ]);

    const stats = customerStats[0] || {
      totalOrders: 0,
      uniqueCustomers: 0,
      guestOrders: 0,
      registeredOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0
    };

    // Process guest vs customer orders
    const guestOrders = newVsReturningCustomers.guest || {
      count: 0,
      totalRevenue: 0,
      avgRevenue: 0
    };
    
    const customerOrders = newVsReturningCustomers.customer || {
      count: 0,
      totalRevenue: 0,
      avgRevenue: 0
    };

    // Calculate Customer Lifetime Value (only for registered customers)
    // Use actual customer count from topCustomers instead of stats.uniqueCustomers
    const actualCustomerCount = topCustomers.length;
    const customerRevenue = customerOrders.totalRevenue; // Only revenue from registered customers
    
    // Debug logging
    console.log('CLV Debug:', {
      statsUniqueCustomers: stats.uniqueCustomers,
      actualCustomerCount,
      customerRevenue,
      customerOrdersCount: customerOrders.count,
      avgCLV: actualCustomerCount > 0 ? (customerRevenue / actualCustomerCount) : 0
    });
    
    const avgCLV = actualCustomerCount > 0 ? (customerRevenue / actualCustomerCount) : 0;

    // Calculate trend percentage
    let trendPercentage = 0;
    if (prevCustomerStats.length > 0 && prevCustomerStats[0].uniqueCustomers > 0) {
      trendPercentage = ((stats.uniqueCustomers - prevCustomerStats[0].uniqueCustomers) / prevCustomerStats[0].uniqueCustomers) * 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: stats.uniqueCustomers,
        totalOrders: stats.totalOrders,
        guestOrders: stats.guestOrders,
        registeredOrders: stats.registeredOrders,
        avgOrderValue: stats.avgOrderValue,
        avgCustomerLifetimeValue: avgCLV,
        topCustomers: topCustomers.map(customer => ({
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          totalRevenue: customer.totalRevenue,
          totalOrders: customer.totalOrders,
          avgOrderValue: customer.avgOrderValue,
          lastOrderDate: customer.lastOrderDate
        })),
        guestVsCustomerOrders: {
          guest: {
            count: guestOrders.count,
            totalRevenue: guestOrders.totalRevenue,
            avgRevenue: guestOrders.avgRevenue,
            percentage: stats.totalOrders > 0 ? (guestOrders.count / stats.totalOrders) * 100 : 0
          },
          customer: {
            count: customerOrders.count,
            totalRevenue: customerOrders.totalRevenue,
            avgRevenue: customerOrders.avgRevenue,
            percentage: stats.totalOrders > 0 ? (customerOrders.count / stats.totalOrders) * 100 : 0
          }
        },
        trend: {
          percentage: trendPercentage,
          isPositive: trendPercentage >= 0,
          previousCustomers: prevCustomerStats[0]?.uniqueCustomers || 0
        },
        trendData: customerTrendData.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          newCustomers: item.newCustomers
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching customers analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers analytics' },
      { status: 500 }
    );
  }
}
