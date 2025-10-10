import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import DiscountCode from '@/lib/models/DiscountCode';
import { Product } from '@/lib/models/Product';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { User } from '@/lib/models/User';
import { generateUniqueOrderNumber } from '@/lib/generate-order-number';

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
      return response!;
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
      return response!;
    }

    const body = await request.json();
    const { items, shippingAddress, billingAddress, paymentMethod, redeemPoints, pointsToRedeem, newsletterSubscribed, discountCode } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: 'Shipping address required' }, { status: 400 });
    }

    await connectToDatabase();

    // Generate unique order number
    let orderNumber: string;
    try {
      orderNumber = await generateUniqueOrderNumber();
    } catch (error) {
      console.error('Error generating order number:', error);
      return NextResponse.json({ error: 'Fehler beim Generieren der Bestellnummer. Bitte versuchen Sie es erneut.' }, { status: 500 });
    }

    // Calculate total and bonus points (all in cents)
    const subtotalCents = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    // Shipping in cents
    const shippingCents = subtotalCents < 8000 ? 495 : 0;
    const totalWithShippingCents = subtotalCents + shippingCents;

    // Apply discount code if provided (validate directly on server with user context)
    let appliedDiscountCents = 0;
    let appliedDiscountCode: string | undefined = undefined;
    let appliedDiscountId: string | undefined = undefined;
    if (discountCode && typeof discountCode === 'string') {
      try {
        const normalized = String(discountCode).trim().toUpperCase();
        const now = new Date();
        const doc: any = await DiscountCode.findOne({ code: normalized }).lean();
        if (doc) {
          const isActive = doc.active !== false;
          const notStarted = doc.startsAt ? now < new Date(doc.startsAt) : false;
          const expired = doc.endsAt ? now > new Date(doc.endsAt) : false;
          const maxReached = (typeof doc.maxGlobalUses === 'number' && typeof doc.globalUses === 'number')
            ? doc.globalUses >= doc.maxGlobalUses
            : false;

          if (isActive && !notStarted && !expired && !maxReached) {
            // Enforce one-time per user if enabled
            if (doc.oneTimeUse) {
              const alreadyUsed = await Order.findOne({ userId: user._id.toString(), discountId: (doc as any)._id?.toString() }).lean();
              if (!alreadyUsed) {
                // Compute discount in cents
                let dCents = 0;
                if (doc.type === 'percent') {
                  dCents = Math.floor((subtotalCents * Number(doc.value)) / 100);
                } else {
                  dCents = Math.floor(Number(doc.value));
                }
                dCents = Math.min(dCents, Math.max(0, subtotalCents - 1));
                if (dCents > 0) {
                  appliedDiscountCents = dCents;
                  appliedDiscountCode = String(doc.code);
                  appliedDiscountId = String((doc as any)._id || '');
                }
              }
            } else {
              // Compute discount in cents
              let dCents = 0;
              if (doc.type === 'percent') {
                dCents = Math.floor((subtotalCents * Number(doc.value)) / 100);
              } else {
                dCents = Math.floor(Number(doc.value));
              }
              dCents = Math.min(dCents, Math.max(0, subtotalCents - 1));
              if (dCents > 0) {
                appliedDiscountCents = dCents;
                appliedDiscountCode = String(doc.code);
                appliedDiscountId = String((doc as any)._id || '');
              }
            }
          }
        }
      } catch (e) {
        console.warn('Discount validation failed:', e);
      }
    }

    // Bonuspunkte-Rabatt in cents
    const getPointsDiscount = (points: number, orderTotalCents: number) => {
      const maxDiscount = orderTotalCents - 1; // Mindestens 1 Cent zu bezahlen
      if (points >= 5000 && 50 * 100 <= maxDiscount) return 50 * 100; // 50€
      if (points >= 4000 && 35 * 100 <= maxDiscount) return 35 * 100; // 35€
      if (points >= 3000 && 20 * 100 <= maxDiscount) return 20 * 100; // 20€
      if (points >= 2000 && 10 * 100 <= maxDiscount) return 10 * 100; // 10€
      if (points >= 1000 && 5 * 100 <= maxDiscount) return 5 * 100;   // 5€
      return 0;
    };

    const pointsDiscountCents = redeemPoints && pointsToRedeem ? getPointsDiscount(pointsToRedeem, totalWithShippingCents - appliedDiscountCents) : 0;
    const totalCents = Math.max(0, totalWithShippingCents - appliedDiscountCents - pointsDiscountCents);

    const bonusPointsEarned = Math.floor((subtotalCents / 100) * 3.5); // 350% vom ursprünglichen Bestellwert (in Punkten)

    // Create new order (persist euros for subtotal/total, keep shippingCosts in cents as before)
    const order = new Order({
      orderNumber: orderNumber,
      userId: user._id.toString(),
      items: items,
      subtotal: subtotalCents / 100,
      shippingCosts: shippingCents,
      total: totalCents / 100,
      // Persist discounts (prices are cents in items)
      ...(appliedDiscountCents > 0 ? { discountId: appliedDiscountId, discountCode: appliedDiscountCode, discountCents: appliedDiscountCents } : {}),
      shippingAddress: shippingAddress,
      billingAddress: billingAddress && billingAddress.street && billingAddress.houseNumber && billingAddress.city && billingAddress.postalCode ? billingAddress : shippingAddress,
      paymentMethod: paymentMethod || 'card',
      paymentStatus: 'pending',
      bonusPointsEarned: bonusPointsEarned,
      bonusPointsCredited: false,
      bonusPointsRedeemed: redeemPoints ? pointsToRedeem : 0,
      status: 'pending'
    });

    try {
      await order.save();
    } catch (error: any) {
      console.error('Error saving order:', error);
      
      // Check if it's a duplicate key error
      if (error.code === 11000 && error.keyPattern?.orderNumber) {
        return NextResponse.json({ 
          error: 'Bestellnummer bereits vergeben. Bitte versuchen Sie es erneut.' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Fehler beim Speichern der Bestellung. Bitte versuchen Sie es erneut.' 
      }, { status: 500 });
    }

    // Reduce stock for all items in the order
    await reduceStock(items);

    // Increment discount global uses if applied
    if (appliedDiscountCode) {
      try {
        await DiscountCode.updateOne(
          { code: appliedDiscountCode },
          { $inc: { globalUses: 1 } }
        );
      } catch (incErr) {
        console.warn('Failed to increment discount globalUses:', incErr);
      }
    }

    // Deduct bonus points if redeemed
    if (redeemPoints && pointsToRedeem > 0) {
      const userData = await User.findById(user._id.toString());
      if (userData && userData.bonusPoints >= pointsToRedeem) {
        userData.bonusPoints -= pointsToRedeem;
        await userData.save();
      } else {
        return NextResponse.json({ error: 'Nicht genügend Bonuspunkte verfügbar' }, { status: 400 });
      }
    }

    // Send order confirmation email
    let emailSent = false;
    try {
      const userData = await User.findById(user._id.toString());
      if (userData && userData.email) {
        await sendOrderConfirmationEmail({
          name: userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}` 
            : userData.name || 'Kunde',
          email: userData.email,
          orderNumber: orderNumber,
          items: items,
          subtotal: subtotalCents / 100,
          shippingCosts: shippingCents,
          total: totalCents / 100,
          bonusPointsEarned: bonusPointsEarned,
          pointsRedeemed: redeemPoints ? pointsToRedeem : 0,
          pointsDiscount: pointsDiscountCents,
          discountCode: appliedDiscountCode,
          discountCents: discountCode ? appliedDiscountCents : 0,
          shippingAddress: shippingAddress,
          billingAddress: billingAddress && billingAddress.street && billingAddress.houseNumber && billingAddress.city && billingAddress.postalCode ? billingAddress : shippingAddress,
          paymentMethod: paymentMethod || 'card'
        });
        emailSent = true;
      }
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // Don't fail the order creation if email fails
    }

    // Update order with email status
    if (emailSent) {
      order.isEmailSent = true;
      await order.save();
    }

    // Subscribe to newsletter if requested
    if (newsletterSubscribed) {
      try {
        const userData = await User.findById(user._id.toString());
        if (userData && userData.email) {
          // Update newsletter subscription in database
          userData.newsletterSubscribed = true;
          await userData.save();
          
          const newsletterResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userData.email,
              firstName: userData.firstName || '',
              lastName: userData.lastName || ''
            })
          });
          
          if (!newsletterResponse.ok) {
            console.error('Newsletter subscription failed:', await newsletterResponse.text());
          }
        }
      } catch (newsletterError) {
        console.error('Error subscribing to newsletter:', newsletterError);
        // Don't fail the order creation if newsletter subscription fails
      }
    }

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
