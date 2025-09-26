import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ReturnRequest from '@/lib/models/Return';
import { Product } from '@/lib/models/Product';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { sendReturnCompletedEmail } from '@/lib/email';

async function incrementStockForAcceptedItems(returnDoc: any) {
  for (const item of returnDoc.items) {
    if (!item.accepted) continue;
    const product = await Product.findOne({ slug: item.productId });
    if (!product) continue;

    if (product.variations && product.variations.length > 0 && item.variations) {
      for (const variation of product.variations) {
        const selectedValue = item.variations[variation.name];
        if (selectedValue) {
          const selectedOption = variation.options.find((opt: any) => opt.value === selectedValue);
          if (selectedOption) {
            const current = Number(selectedOption.stockQuantity || 0);
            selectedOption.stockQuantity = current + item.quantity;
            selectedOption.inStock = (selectedOption.stockQuantity || 0) > 0;
          }
        }
      }
    } else {
      const current = Number(product.stockQuantity || 0);
      product.stockQuantity = current + item.quantity;
      product.inStock = (product.stockQuantity || 0) > 0;
    }

    await product.save();
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();
    const { id } = await params;
    const doc = await ReturnRequest.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    return NextResponse.json({ returnRequest: doc });
  } catch (error) {
    console.error('Error fetching return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();

    const payload = await request.json();
    const { items, status, notes, refund } = payload as { items?: Array<{ productId: string; accepted: boolean; quantity?: number }>; status?: 'processing'|'completed'|'rejected'; notes?: string; refund?: { method?: string; reference?: string; amount?: number } };

    const { id } = await params;
    const returnDoc = await ReturnRequest.findById(id);
    if (!returnDoc) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (Array.isArray(items)) {
      const map = new Map(items.map(i => [i.productId, i]));
      returnDoc.items = returnDoc.items.map((it: any) => {
        const update = map.get(it.productId);
        if (update) {
          if (typeof update.accepted === 'boolean') it.accepted = update.accepted;
          if (typeof update.quantity === 'number' && update.quantity >= 0) it.quantity = Math.min(update.quantity, it.quantity);
        }
        return it;
      }) as any;
    }

    if (typeof notes === 'string') {
      returnDoc.notes = notes;
    }

    if (status) {
      returnDoc.status = status;
    }

    if (refund && typeof refund === 'object') {
      returnDoc.refund = {
        method: refund.method || returnDoc.refund?.method,
        reference: refund.reference || returnDoc.refund?.reference,
        amount: typeof refund.amount === 'number' ? refund.amount : returnDoc.refund?.amount,
      } as any;
    }

    // If completing, increment stock for accepted items and send email
    if (status === 'completed') {
      await incrementStockForAcceptedItems(returnDoc);

      // fetch order to get orderNumber and user data if needed
      const order = await Order.findById(returnDoc.orderId).lean();
      
      // Fetch user data to get firstName and lastName
      const userData = await User.findById(returnDoc.userId);
      const customerName = userData?.firstName && userData?.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : returnDoc.customer?.name || 'Kunde';
      
      const acceptedItems = returnDoc.items.filter((it: any) => it.accepted).map((it: any) => ({ name: it.name, quantity: it.quantity, variations: it.variations }));
      const rejectedItems = returnDoc.items.filter((it: any) => !it.accepted).map((it: any) => ({ name: it.name, quantity: it.quantity, variations: it.variations }));
      
      await sendReturnCompletedEmail({
        name: customerName,
        email: returnDoc.customer?.email,
        orderNumber: order?.orderNumber || returnDoc.orderNumber,
        acceptedItems,
        rejectedItems,
      });

      // Also set order status -> return_completed
      await Order.findByIdAndUpdate(returnDoc.orderId, { $set: { status: 'return_completed' } });
    }

    await returnDoc.save();
    return NextResponse.json({ success: true, returnRequest: returnDoc });
  } catch (error) {
    console.error('Error updating return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


