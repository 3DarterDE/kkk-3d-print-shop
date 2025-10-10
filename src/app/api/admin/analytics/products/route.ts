import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import Category from '@/lib/models/Category';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const unsoldPage = parseInt(searchParams.get('unsoldPage') || '1');
    const stockSortOrder = searchParams.get('stockSortOrder') || 'asc'; // 'asc' for 0-10, 'desc' for 10-0

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

    // Main statistics
    const [
      productStats,
      topProducts,
      categoryStats,
      brandStats,
      lowStockProducts,
      unsoldProducts
    ] = await Promise.all([
      // Overall product statistics
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalProductsSold: { $sum: { $sum: '$items.quantity' } },
            totalOrders: { $sum: 1 }
          }
        },
        {
          $addFields: {
            avgProductsPerOrder: { $divide: ['$totalProductsSold', '$totalOrders'] }
          }
        }
      ]),

      // Top selling products
      Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              productId: '$items.productId',
              name: '$items.name'
            },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 20 }
      ]),

      // Products by category - simplified approach
      (async () => {
        const orders = await Order.find(matchStage).lean();
        const categoryMap = new Map();
        
        for (const order of orders) {
          for (const item of order.items) {
            const product = await Product.findOne({ slug: item.productId }).lean();
            if (product && !Array.isArray(product) && product.categoryId) {
              const category = await Category.findById(product.categoryId).lean();
              const categoryName = (category && !Array.isArray(category)) ? category.name : 'Keine Kategorie';
              
              if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, {
                  categoryName,
                  totalQuantity: 0,
                  totalRevenue: 0,
                  uniqueProducts: new Set()
                });
              }
              
              const cat = categoryMap.get(categoryName);
              cat.totalQuantity += item.quantity;
              cat.totalRevenue += ((item.price / 100) * item.quantity);
              cat.uniqueProducts.add(item.productId.toString());
            }
          }
        }
        
        return Array.from(categoryMap.values()).map(cat => ({
          categoryName: cat.categoryName,
          totalQuantity: cat.totalQuantity,
          totalRevenue: cat.totalRevenue,
          productCount: cat.uniqueProducts.size
        })).sort((a, b) => b.totalQuantity - a.totalQuantity);
      })(),

      // Products by brand - simplified approach
      (async () => {
        const orders = await Order.find(matchStage).lean();
        const brandMap = new Map();
        
        for (const order of orders) {
          for (const item of order.items) {
            const product = await Product.findOne({ slug: item.productId }).lean();
            if (product && !Array.isArray(product)) {
              const brandName = product.brand || 'Keine Marke';
              
              if (!brandMap.has(brandName)) {
                brandMap.set(brandName, {
                  brandName,
                  totalQuantity: 0,
                  totalRevenue: 0,
                  uniqueProducts: new Set()
                });
              }
              
              const brand = brandMap.get(brandName);
              brand.totalQuantity += item.quantity;
              brand.totalRevenue += ((item.price / 100) * item.quantity);
              brand.uniqueProducts.add(item.productId.toString());
            }
          }
        }
        
        return Array.from(brandMap.values()).map(brand => ({
          brandName: brand.brandName,
          totalQuantity: brand.totalQuantity,
          totalRevenue: brand.totalRevenue,
          productCount: brand.uniqueProducts.size
        })).sort((a, b) => b.totalQuantity - a.totalQuantity);
      })(),

      // Low stock products - check both general stock and individual variations
      (async () => {
        const allProducts = await Product.find({}).select('title sku stockQuantity inStock price variations').lean();
        const lowStockItems = [];
        
        for (const product of allProducts) {
          // Check if product has variations
          const hasVariations = product.variations && Array.isArray(product.variations) && product.variations.length > 0;
          
          if (hasVariations) {
            // If product has variations, only check variation stocks, ignore general stock
            for (const variation of product.variations) {
              if (variation.options && Array.isArray(variation.options)) {
                for (const option of variation.options) {
                  if (option.stockQuantity <= 10 || option.inStock === false) {
                    lowStockItems.push({
                      title: `${product.title} - ${option.value}`,
                      sku: product.sku,
                      stockQuantity: option.stockQuantity || 0,
                      inStock: option.inStock || false,
                      price: product.price / 100,
                      variation: option.value
                    });
                  }
                }
              }
            }
          } else {
            // If product has no variations, check general stock
            if (product.stockQuantity <= 10 || product.inStock === false) {
              lowStockItems.push({
                title: product.title,
                sku: product.sku,
                stockQuantity: product.stockQuantity,
                inStock: product.inStock,
                price: product.price / 100,
                variation: null // General product
              });
            }
          }
        }
        
        // Sort by stock quantity
        lowStockItems.sort((a, b) => {
          if (stockSortOrder === 'asc') {
            return a.stockQuantity - b.stockQuantity; // 0-10
          } else {
            return b.stockQuantity - a.stockQuantity; // 10-0
          }
        });
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = lowStockItems.slice(startIndex, endIndex);
        
        return {
          items: paginatedItems,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(lowStockItems.length / limit),
            totalItems: lowStockItems.length,
            itemsPerPage: limit,
            hasNextPage: endIndex < lowStockItems.length,
            hasPrevPage: page > 1
          }
        };
      })(),

      // Unsold products (products that have never been ordered) - simplified approach with pagination
      (async () => {
        const allProducts = await Product.find({}).select('title sku price createdAt slug').lean();
        const orders = await Order.find({}).select('items.productId').lean();
        
        const soldProductSlugs = new Set();
        for (const order of orders) {
          for (const item of order.items) {
            soldProductSlugs.add(item.productId);
          }
        }
        
        const unsoldProducts = allProducts.filter(product => !soldProductSlugs.has(product.slug));
        
        // Sort and apply pagination
        const sortedProducts = unsoldProducts
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const startIndex = (unsoldPage - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
        
        return {
          items: paginatedProducts.map(product => ({
            title: product.title,
            sku: product.sku,
            price: product.price / 100, // Convert from cents to euros
            createdAt: product.createdAt
          })),
          pagination: {
            currentPage: unsoldPage,
            totalPages: Math.ceil(sortedProducts.length / limit),
            totalItems: sortedProducts.length,
            itemsPerPage: limit,
            hasNextPage: endIndex < sortedProducts.length,
            hasPrevPage: unsoldPage > 1
          }
        };
      })()
    ]);

    const stats = productStats[0] || {
      totalProductsSold: 0,
      totalOrders: 0,
      avgProductsPerOrder: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        totalProductsSold: stats.totalProductsSold,
        totalOrders: stats.totalOrders,
        avgProductsPerOrder: stats.avgProductsPerOrder,
        topProducts: topProducts.map(product => ({
          productId: product._id.productId,
          name: product._id.name,
          totalQuantity: product.totalQuantity,
          totalRevenue: product.totalRevenue / 100, // Convert cents to euros
          orderCount: product.orderCount
        })),
        categoryStats: categoryStats.map(cat => ({
          categoryName: cat.categoryName,
          totalQuantity: cat.totalQuantity,
          totalRevenue: cat.totalRevenue,
          productCount: cat.productCount
        })),
        brandStats: brandStats.map(brand => ({
          brandName: brand.brandName,
          totalQuantity: brand.totalQuantity,
          totalRevenue: brand.totalRevenue,
          productCount: brand.productCount
        })),
        lowStockProducts: {
          items: lowStockProducts.items.map(item => ({
            title: item.title,
            sku: item.sku,
            stockQuantity: item.stockQuantity,
            inStock: item.inStock,
            price: item.price,
            variation: item.variation
          })),
          pagination: lowStockProducts.pagination
        },
        unsoldProducts: {
          items: unsoldProducts.items.map(product => ({
            title: product.title,
            sku: product.sku,
            price: product.price, // Already converted to euros
            createdAt: product.createdAt
          })),
          pagination: unsoldProducts.pagination
        }
      }
    });
  } catch (error) {
    console.error('Error fetching products analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products analytics' },
      { status: 500 }
    );
  }
}
