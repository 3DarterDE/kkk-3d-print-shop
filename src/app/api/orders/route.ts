import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';

// Function to reduce stock for products and variations
async function reduceStock(items: any[]) {
  for (const item of items) {
    const product = await Product.findOne({ slug: item.productId });
    
    if (!product) {
      console.warn(`Product not found: ${item.productId}`);
      continue;
    }

    // If product has variations, reduce variation-specific stock
    if (product.variations && product.variations.length > 0 && item.variations) {
      for (const variation of product.variations) {
        const selectedValue = item.variations[variation.name];
        if (selectedValue) {
          const selectedOption = variation.options.find((option: any) => option.value === selectedValue);
          if (selectedOption && selectedOption.stockQuantity !== undefined) {
            // Reduce variation-specific stock
            selectedOption.stockQuantity = Math.max(0, selectedOption.stockQuantity - item.quantity);
            selectedOption.inStock = selectedOption.stockQuantity > 0;
          }
        }
      }
    } else {
      // Reduce main product stock
      product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
      product.inStock = product.stockQuantity > 0;
    }

    await product.save();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    
    if (!user) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    await connectToDatabase();

    // Fetch orders from database
    const orders = await Order.find({ userId: user._id.toString() })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments({ userId: user._id.toString() });

    return NextResponse.json({
      orders,
      total,
      page,
      limit
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    
    if (!user) {
      return response;
    }

    const body = await request.json();
    const { items, shippingAddress, billingAddress, paymentMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: 'Shipping address required' }, { status: 400 });
    }

    await connectToDatabase();

          // Generate order number
          const count = await Order.countDocuments();
          const orderNumber = `3DS-${new Date().getFullYear().toString().slice(-2)}${String(count + 1).padStart(3, '0')}`;

    // Create new order
    const order = new Order({
      orderNumber: orderNumber,
      userId: user._id.toString(),
      items: items,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod: paymentMethod || 'card',
      paymentStatus: 'pending',
      total: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
      status: 'pending'
    });

    await order.save();

    // Reduce stock for all items in the order
    await reduceStock(items);

    return NextResponse.json({
      success: true,
      order: order,
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
