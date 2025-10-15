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

    const matchStage: any = {};
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
        createdAt: { $gte: prevStart, $lt: prevEnd }
      };
    }

    // Main statistics
    const [
      returnStats,
      topReturnedProducts,
      returnTrendData,
      avgProcessingTime,
      prevReturnStats
    ] = await Promise.all([
      // Return statistics - calculate refund amounts correctly
      (async () => {
        const returns = await ReturnRequest.find(matchStage).lean();
        let totalRefundAmount = 0;
        
        for (const returnDoc of returns) {
          if (returnDoc.status === 'completed') {
            // Get the original order to calculate correct refund amount
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
              
              // Add shipping costs if all items are being returned (including previous returns)
              const totalSelectedQuantity = acceptedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
              const totalOrderQuantity = order.items.reduce((sum: number, it: any) => sum + it.quantity, 0);
              
              // Get all completed returns for this order to calculate total returned quantity
              const allCompletedReturns = await ReturnRequest.find({ 
                orderId: order._id.toString(), 
                status: 'completed' 
              }).lean();
              
              // Calculate total returned quantity across all completed returns
              let totalReturnedQuantity = 0;
              allCompletedReturns.forEach(returnDoc => {
                returnDoc.items.forEach((item: any) => {
                  if (item.accepted) {
                    totalReturnedQuantity += item.quantity;
                  }
                });
              });
              
              const isFullReturn = totalReturnedQuantity >= totalOrderQuantity;
              const shippingCents = Number(order.shippingCosts || 0);
              
              const finalRefundCents = itemsRefundCents + (isFullReturn ? shippingCents : 0);
              totalRefundAmount += finalRefundCents / 100;
            }
          }
        }
        
        return [{
          totalReturns: returns.length,
          completedReturns: returns.filter(r => r.status === 'completed').length,
          processingReturns: returns.filter(r => r.status === 'processing').length,
          rejectedReturns: returns.filter(r => r.status === 'rejected').length,
          totalRefundAmount: totalRefundAmount
        }];
      })(),

      // Top returned products
      ReturnRequest.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        { $unwind: '$items' },
        { $match: { 'items.accepted': true } },
        {
          $group: {
            _id: {
              productId: '$items.productId',
              name: '$items.name'
            },
            totalQuantity: { $sum: '$items.quantity' },
            totalValue: { $sum: { $multiply: [{ $divide: ['$items.price', 100] }, '$items.quantity'] } }, // Convert cents to euros
            returnCount: { $sum: 1 }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]),

      // Return trend over time
      ReturnRequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            returns: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 100 }
      ]),

      // Average processing time
      ReturnRequest.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        {
          $project: {
            processingTime: {
              $divide: [
                { $subtract: ['$updatedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' }
          }
        }
      ]),

      // Previous period stats for comparison
      prevMatchStage ? ReturnRequest.aggregate([
        { $match: prevMatchStage },
        {
          $group: {
            _id: null,
            totalReturns: { $sum: 1 },
            completedReturns: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ]) : Promise.resolve([])
    ]);

    // Get total orders for return rate calculation
    const totalOrders = await Order.countDocuments({
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      status: { $nin: ['cancelled'] }
    });

    const stats = returnStats[0] || {
      totalReturns: 0,
      completedReturns: 0,
      processingReturns: 0,
      rejectedReturns: 0,
      totalRefundAmount: 0
    };

    const avgTime = avgProcessingTime[0] || { avgProcessingTime: 0 };

    // Calculate return rate
    const returnRate = totalOrders > 0 ? (stats.totalReturns / totalOrders) * 100 : 0;

    // Calculate trend percentage
    let trendPercentage = 0;
    if (prevReturnStats.length > 0 && prevReturnStats[0].totalReturns > 0) {
      trendPercentage = ((stats.totalReturns - prevReturnStats[0].totalReturns) / prevReturnStats[0].totalReturns) * 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReturns: stats.totalReturns,
        completedReturns: stats.completedReturns,
        processingReturns: stats.processingReturns,
        rejectedReturns: stats.rejectedReturns,
        totalRefundAmount: stats.totalRefundAmount || 0,
        returnRate: returnRate,
        avgProcessingTime: avgTime.avgProcessingTime,
        totalOrders: totalOrders,
        topReturnedProducts: topReturnedProducts.map(product => ({
          productId: product._id.productId,
          name: product._id.name,
          totalQuantity: product.totalQuantity,
          totalValue: product.totalValue,
          returnCount: product.returnCount
        })),
        trend: {
          percentage: trendPercentage,
          isPositive: trendPercentage >= 0,
          previousReturns: prevReturnStats[0]?.totalReturns || 0
        },
        trendData: returnTrendData.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          returns: item.returns,
          completed: item.completed
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching returns analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch returns analytics' },
      { status: 500 }
    );
  }
}
