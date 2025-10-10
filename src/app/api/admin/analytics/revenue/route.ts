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
    const [revenueStats, paymentMethodStats, discountStats, bonusStats, prevRevenue, trendData, returnsData] = await Promise.all([
      // Total revenue and order stats
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
            totalShipping: { $sum: '$shippingCosts' },
            totalSubtotal: { $sum: '$subtotal' }
          }
        }
      ]),

      // Revenue by payment method
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),

      // Discount usage
      Order.aggregate([
        { $match: { ...matchStage, discountCents: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalDiscounts: { $sum: '$discountCents' },
            discountCount: { $sum: 1 }
          }
        }
      ]),

      // Bonus points statistics
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalPointsEarned: { $sum: '$bonusPointsEarned' },
            totalPointsRedeemed: { $sum: '$bonusPointsRedeemed' }
          }
        }
      ]),

      // Previous period revenue for comparison
      prevMatchStage ? Order.aggregate([
        { $match: prevMatchStage },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' }
          }
        }
      ]) : Promise.resolve([]),

      // Revenue trend over time (daily for last 30 days or by period)
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 100 }
      ]),

      // Returns data for net revenue calculation
      (async () => {
        const returns = await ReturnRequest.find({
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
        }).lean();
        
        let totalReturnsAmount = 0;
        let totalReturnsShipping = 0;
        
        for (const returnDoc of returns) {
          const order = await Order.findById(returnDoc.orderId).lean();
          if (order) {
            const acceptedItems = returnDoc.items.filter((item: any) => item.accepted);
            
            // Calculate refund for accepted items
            const orderSubtotalCents = order.items.reduce((s: number, it: any) => s + (Number(it.price) * Number(it.quantity)), 0);
            const orderDiscountCents = Number(order.discountCents || 0);
            const pointsDiscountCents = Number(order.bonusPointsRedeemed || 0) > 0 ? 
              ((order.bonusPointsRedeemed || 0) >= 5000 ? 50 : 
               (order.bonusPointsRedeemed || 0) >= 4000 ? 35 :
               (order.bonusPointsRedeemed || 0) >= 3000 ? 20 :
               (order.bonusPointsRedeemed || 0) >= 2000 ? 10 :
               (order.bonusPointsRedeemed || 0) >= 1000 ? 5 : 0) * 100 : 0;
            
            let itemsRefundCents = 0;
            for (const item of acceptedItems) {
              const orig = order.items.find((oi: any) => oi.name === item.name);
              if (orig && orderSubtotalCents > 0) {
                const origLineTotal = Number(orig.price) * Number(orig.quantity);
                const share = Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents));
                const proratedDiscount = Math.round(orderDiscountCents * share);
                const proratedPoints = Math.round(pointsDiscountCents * share);
                const perUnitDeduction = Math.round(proratedDiscount / Number(orig.quantity)) + Math.round(proratedPoints / Number(orig.quantity));
                const effectiveUnitCents = Math.max(0, Number(item.price) - perUnitDeduction);
                itemsRefundCents += effectiveUnitCents * item.quantity;
              }
            }
            
            // Add shipping costs if all items are being returned
            const totalSelectedQuantity = acceptedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
            const totalOrderQuantity = order.items.reduce((sum: number, it: any) => sum + it.quantity, 0);
            const isFullReturn = totalSelectedQuantity >= totalOrderQuantity;
            const shippingCents = Number(order.shippingCosts || 0);
            
            const finalRefundCents = itemsRefundCents + (isFullReturn ? shippingCents : 0);
            totalReturnsAmount += finalRefundCents / 100;
            totalReturnsShipping += (isFullReturn ? shippingCents : 0) / 100;
          }
        }
        
        return {
          totalReturnsAmount,
          totalReturnsShipping,
          totalReturns: returns.length
        };
      })()
    ]);

    const stats = revenueStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      totalShipping: 0,
      totalSubtotal: 0
    };

    const discount = discountStats[0] || {
      totalDiscounts: 0,
      discountCount: 0
    };

    const bonus = bonusStats[0] || {
      totalPointsEarned: 0,
      totalPointsRedeemed: 0
    };

    // Calculate trend percentage
    let trendPercentage = 0;
    if (prevRevenue.length > 0 && prevRevenue[0].totalRevenue > 0) {
      trendPercentage = ((stats.totalRevenue - prevRevenue[0].totalRevenue) / prevRevenue[0].totalRevenue) * 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        // Gross revenue (before returns)
        grossRevenue: stats.totalRevenue,
        grossShipping: stats.totalShipping / 100, // Convert cents to euros
        
        // Returns data
        returns: {
          totalAmount: returnsData?.totalReturnsAmount || 0,
          totalShipping: returnsData?.totalReturnsShipping || 0,
          count: returnsData?.totalReturns || 0
        },
        
        // Net revenue (after returns)
        netRevenue: stats.totalRevenue - (returnsData?.totalReturnsAmount || 0),
        netShipping: (stats.totalShipping / 100) - (returnsData?.totalReturnsShipping || 0),
        
        // Other stats
        totalOrders: stats.totalOrders,
        avgOrderValue: stats.avgOrderValue,
        totalSubtotal: stats.totalSubtotal,
        discounts: {
          total: discount.totalDiscounts / 100, // Convert cents to euros
          count: discount.discountCount,
          avgDiscount: discount.discountCount > 0 ? (discount.totalDiscounts / discount.discountCount) / 100 : 0 // Convert cents to euros
        },
        bonusPoints: {
          earned: bonus.totalPointsEarned,
          redeemed: bonus.totalPointsRedeemed,
          earnedValue: null, // Cannot calculate exact value due to tiered redemption system
          redeemedValue: bonus.totalPointsRedeemed >= 5000 ? 50 : 
                        bonus.totalPointsRedeemed >= 4000 ? 35 :
                        bonus.totalPointsRedeemed >= 3000 ? 20 :
                        bonus.totalPointsRedeemed >= 2000 ? 10 :
                        bonus.totalPointsRedeemed >= 1000 ? 5 : 0
        },
        paymentMethods: paymentMethodStats.map(pm => ({
          method: pm._id || 'Unbekannt',
          total: pm.total,
          count: pm.count,
          percentage: stats.totalRevenue > 0 ? (pm.total / stats.totalRevenue) * 100 : 0
        })),
        trend: {
          percentage: trendPercentage,
          isPositive: trendPercentage >= 0,
          previousRevenue: prevRevenue[0]?.totalRevenue || 0
        },
        trendData: trendData.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          revenue: item.revenue,
          orders: item.orders
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue analytics' },
      { status: 500 }
    );
  }
}

