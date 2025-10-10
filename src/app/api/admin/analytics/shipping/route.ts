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
      shippingStats,
      shippingProviderStats,
      freeShippingStats,
      shippingTrendData,
      prevShippingStats,
      returnsData
    ] = await Promise.all([
      // Total shipping costs and stats
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalShippingCosts: { $sum: '$shippingCosts' },
            totalOrders: { $sum: 1 },
            avgShippingCosts: { $avg: '$shippingCosts' },
            freeShippingOrders: { $sum: { $cond: [{ $eq: ['$shippingCosts', 0] }, 1, 0] } },
            paidShippingOrders: { $sum: { $cond: [{ $gt: ['$shippingCosts', 0] }, 1, 0] } }
          }
        }
      ]),

      // Shipping costs by provider
      Order.aggregate([
        { $match: matchStage },
        { $unwind: '$trackingInfo' },
        {
          $group: {
            _id: '$trackingInfo.shippingProvider',
            totalShippingCosts: { $sum: '$shippingCosts' },
            totalOrders: { $sum: 1 },
            avgShippingCosts: { $avg: '$shippingCosts' }
          }
        },
        { $sort: { totalShippingCosts: -1 } }
      ]),

      // Free vs paid shipping analysis
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $cond: [{ $eq: ['$shippingCosts', 0] }, 'free', 'paid']
            },
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' }
          }
        }
      ]),

      // Shipping trend over time
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            shippingCosts: { $sum: '$shippingCosts' },
            orders: { $sum: 1 },
            avgShipping: { $avg: '$shippingCosts' }
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
            totalShippingCosts: { $sum: '$shippingCosts' },
            totalOrders: { $sum: 1 }
          }
        }
      ]) : Promise.resolve([]),

      // Returns data for net shipping calculation
      (async () => {
        const returns = await ReturnRequest.find({
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
        }).lean();
        
        let totalReturnsShipping = 0;
        
        for (const returnDoc of returns) {
          const order = await Order.findById(returnDoc.orderId).lean();
          if (order) {
            const acceptedItems = returnDoc.items.filter((item: any) => item.accepted);
            
            // Check if all items are being returned (for shipping refund)
            const totalSelectedQuantity = acceptedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
            const totalOrderQuantity = order.items.reduce((sum: number, it: any) => sum + it.quantity, 0);
            const isFullReturn = totalSelectedQuantity >= totalOrderQuantity;
            
            if (isFullReturn) {
              const shippingCents = Number(order.shippingCosts || 0);
              totalReturnsShipping += shippingCents / 100;
            }
          }
        }
        
        return {
          totalReturnsShipping,
          totalReturns: returns.length
        };
      })()
    ]);

    const stats = shippingStats[0] || {
      totalShippingCosts: 0,
      totalOrders: 0,
      avgShippingCosts: 0,
      freeShippingOrders: 0,
      paidShippingOrders: 0
    };

    // Calculate trend percentage
    let trendPercentage = 0;
    if (prevShippingStats.length > 0 && prevShippingStats[0].totalShippingCosts > 0) {
      trendPercentage = ((stats.totalShippingCosts - prevShippingStats[0].totalShippingCosts) / prevShippingStats[0].totalShippingCosts) * 100;
    }

    // Process free vs paid shipping data
    const freeShippingData = freeShippingStats.find(item => item._id === 'free') || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0
    };
    
    const paidShippingData = freeShippingStats.find(item => item._id === 'paid') || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        // Gross shipping costs (before returns)
        grossShippingCosts: stats.totalShippingCosts / 100, // Convert cents to euros
        grossAvgShippingCosts: stats.avgShippingCosts / 100, // Convert cents to euros
        
        // Returns data
        returns: {
          totalShipping: returnsData?.totalReturnsShipping || 0,
          count: returnsData?.totalReturns || 0
        },
        
        // Net shipping costs (after returns)
        netShippingCosts: (stats.totalShippingCosts / 100) - (returnsData?.totalReturnsShipping || 0),
        netAvgShippingCosts: stats.avgShippingCosts / 100, // Convert cents to euros
        
        // Other stats
        totalOrders: stats.totalOrders,
        freeShippingOrders: stats.freeShippingOrders,
        paidShippingOrders: stats.paidShippingOrders,
        shippingProviders: shippingProviderStats.map(provider => ({
          provider: provider._id || 'Unbekannt',
          totalCosts: provider.totalShippingCosts / 100, // Convert cents to euros
          totalOrders: provider.totalOrders,
          avgCosts: provider.avgShippingCosts / 100, // Convert cents to euros
          percentage: stats.totalShippingCosts > 0 ? (provider.totalShippingCosts / stats.totalShippingCosts) * 100 : 0
        })),
        freeVsPaid: {
          free: {
            orders: freeShippingData.totalOrders,
            revenue: freeShippingData.totalRevenue,
            avgOrderValue: freeShippingData.avgOrderValue,
            percentage: stats.totalOrders > 0 ? (freeShippingData.totalOrders / stats.totalOrders) * 100 : 0
          },
          paid: {
            orders: paidShippingData.totalOrders,
            revenue: paidShippingData.totalRevenue,
            avgOrderValue: paidShippingData.avgOrderValue,
            percentage: stats.totalOrders > 0 ? (paidShippingData.totalOrders / stats.totalOrders) * 100 : 0
          }
        },
        trend: {
          percentage: trendPercentage,
          isPositive: trendPercentage >= 0,
          previousShippingCosts: (prevShippingStats[0]?.totalShippingCosts || 0) / 100 // Convert cents to euros
        },
        trendData: shippingTrendData.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          shippingCosts: item.shippingCosts / 100, // Convert cents to euros
          orders: item.orders,
          avgShipping: item.avgShipping / 100 // Convert cents to euros
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching shipping analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping analytics' },
      { status: 500 }
    );
  }
}
