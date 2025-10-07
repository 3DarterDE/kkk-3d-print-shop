import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import { sendGuestOrderConfirmationEmail } from '@/lib/email';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, shippingAddress, billingAddress, paymentMethod, email, firstName, lastName, newsletterSubscribed } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: 'Shipping address required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email required for guest orders' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if email already exists in database
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Diese E-Mail-Adresse ist bereits registriert. Bitte loggen Sie sich ein, um fortzufahren.',
        requiresLogin: true 
      }, { status: 400 });
    }

    // Generate unique order number
    let orderNumber: string;
    try {
      orderNumber = await generateUniqueOrderNumber();
    } catch (error) {
      console.error('Error generating order number:', error);
      return NextResponse.json({ error: 'Fehler beim Generieren der Bestellnummer. Bitte versuchen Sie es erneut.' }, { status: 500 });
    }

    // Calculate total (all in cents)
    const subtotalCents = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    // Shipping in cents
    const shippingCents = subtotalCents < 8000 ? 495 : 0;
    const totalWithShippingCents = subtotalCents + shippingCents;

    // No bonus points for guest orders
    const totalCents = totalWithShippingCents;

    // Create new guest order
    const order = new Order({
      orderNumber: orderNumber,
      userId: null, // Guest order
      guestEmail: email.toLowerCase(),
      guestName: `${firstName} ${lastName}`,
      items: items,
      subtotal: subtotalCents / 100,
      shippingCosts: shippingCents,
      total: totalCents / 100,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress && billingAddress.street && billingAddress.houseNumber && billingAddress.city && billingAddress.postalCode ? billingAddress : shippingAddress,
      paymentMethod: paymentMethod || 'card',
      paymentStatus: 'pending',
      bonusPointsEarned: 0, // No bonus points for guests
      bonusPointsCredited: false,
      bonusPointsRedeemed: 0, // No bonus points redemption for guests
      status: 'pending'
    });

    try {
      await order.save();
    } catch (error: any) {
      console.error('Error saving guest order:', error);
      
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

    // Send guest order confirmation email
    let emailSent = false;
    try {
      await sendGuestOrderConfirmationEmail({
        email: email.toLowerCase(),
        name: `${firstName} ${lastName}`,
        orderNumber: orderNumber,
        items: items,
        subtotal: subtotalCents / 100,
        shippingCosts: shippingCents,
        total: totalCents / 100,
        shippingAddress: shippingAddress,
        billingAddress: billingAddress && billingAddress.street && billingAddress.houseNumber && billingAddress.city && billingAddress.postalCode ? billingAddress : shippingAddress,
        paymentMethod: paymentMethod || 'card'
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send guest order confirmation email:', emailError);
      // Don't fail the order if email fails
    }

    // Update order with email status
    if (emailSent) {
      order.isEmailSent = true;
      await order.save();
    }

    // Subscribe to newsletter if requested
    if (newsletterSubscribed) {
      try {
        const newsletterResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/newsletter/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase(),
            firstName: firstName || '',
            lastName: lastName || ''
          })
        });
        
        if (!newsletterResponse.ok) {
          console.error('Newsletter subscription failed:', await newsletterResponse.text());
        }
      } catch (newsletterError) {
        console.error('Error subscribing to newsletter:', newsletterError);
        // Don't fail the order creation if newsletter subscription fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      orderNumber: orderNumber,
      message: 'Bestellung erfolgreich erstellt'
    });

  } catch (error) {
    console.error('Error creating guest order:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Bestellung' },
      { status: 500 }
    );
  }
}
