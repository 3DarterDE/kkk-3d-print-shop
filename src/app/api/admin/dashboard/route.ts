import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get all statistics in parallel
    const [
      productCount,
      categoryCount,
      filterCount,
      totalOrders,
      totalRevenue,
      recentProducts,
      topCategories
    ] = await Promise.all([
      // Product count
      db.collection('products').countDocuments(),
      
      // Category count
      db.collection('categories').countDocuments(),
      
      // Filter count
      db.collection('filters').countDocuments(),
      
      // Orders count (if you have an orders collection)
      db.collection('orders').countDocuments().catch(() => 0),
      
      // Total revenue (if you have an orders collection with total field)
      db.collection('orders').aggregate([
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).toArray().then(result => result[0]?.total || 0).catch(() => 0),
      
      // Recent products (last 5)
      db.collection('products').find({}, {
        projection: { name: 1, price: 1, createdAt: 1, isActive: 1 }
      }).sort({ createdAt: -1 }).limit(5).toArray(),
      
      // Top categories by product count
      db.collection('products').aggregate([
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray()
    ]);

    // Get category names for top categories
    const categoryIds = topCategories.map(cat => cat._id);
    const categoryNames = await db.collection('categories').find(
      { _id: { $in: categoryIds } },
      { projection: { name: 1 } }
    ).toArray();
    
    const topCategoriesWithNames = topCategories.map(cat => ({
      ...cat,
      name: categoryNames.find(c => c._id.toString() === cat._id.toString())?.name || 'Unknown'
    }));

    return NextResponse.json({
      success: true,
      data: {
        productCount,
        categoryCount,
        filterCount,
        totalOrders,
        totalRevenue,
        recentProducts,
        topCategories: topCategoriesWithNames
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
