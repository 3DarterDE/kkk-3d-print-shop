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
      totalRevenue
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
      ]).toArray().then(result => result[0]?.total || 0).catch(() => 0)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        productCount,
        categoryCount,
        filterCount,
        totalOrders,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
