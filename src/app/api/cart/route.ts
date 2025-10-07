import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscountCode from '@/lib/models/DiscountCode';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';

export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;

    await connectToDatabase();
    const doc = await User.findById(user._id).select('savedCart').lean();
    let savedCart = (doc as any)?.savedCart || {
      items: [],
      discountCode: null,
      discountCents: 0,
      updatedAt: null,
    };

    // Server-side validation/cleanup of discount code for current user
    try {
      if (savedCart?.discountCode && Array.isArray(savedCart.items) && savedCart.items.length > 0) {
        const code = String(savedCart.discountCode).trim().toUpperCase();
        const dc = await DiscountCode.findOne({ code }).lean();
        const now = new Date();

        let valid = true;
        if (!dc) valid = false;
        if (valid && dc && (dc as any).active === false) valid = false;
        if (valid && dc && (dc as any).startsAt && now < new Date((dc as any).startsAt)) valid = false;
        if (valid && dc && (dc as any).endsAt && now > new Date((dc as any).endsAt)) valid = false;
        if (valid && dc && typeof (dc as any).maxGlobalUses === 'number' && typeof (dc as any).globalUses === 'number' && (dc as any).globalUses >= (dc as any).maxGlobalUses) valid = false;
        if (valid && dc && (dc as any).oneTimeUse) {
          const alreadyUsed = await Order.findOne({ userId: user._id.toString(), discountId: (dc as any)._id?.toString() }).lean();
          if (alreadyUsed) valid = false;
        }

        if (!valid) {
          // Persist cleanup and update response
          await User.findByIdAndUpdate(user._id, { $set: { 'savedCart.discountCode': null, 'savedCart.discountCents': 0, 'savedCart.updatedAt': new Date() } }, { new: false });
          savedCart = { ...savedCart, discountCode: null, discountCents: 0 };
        } else {
          // Recalculate discountCents against current cart subtotal
          const subtotalCents = savedCart.items.reduce((sum: number, it: any) => sum + (Number(it.price) * Number(it.quantity)), 0);
          let discountCents = 0;
          if (dc && (dc as any).type === 'percent') {
            discountCents = Math.floor((subtotalCents * Number((dc as any).value)) / 100);
          } else {
            discountCents = Math.floor(Number((dc as any).value));
          }
          discountCents = Math.min(discountCents, Math.max(0, subtotalCents - 1));
          if (discountCents !== Number(savedCart.discountCents || 0)) {
            await User.findByIdAndUpdate(user._id, { $set: { 'savedCart.discountCents': discountCents, 'savedCart.updatedAt': new Date() } }, { new: false });
            savedCart = { ...savedCart, discountCents };
          }
        }
      }
    } catch (e) {
      // If validation fails, leave savedCart as is; client hook will correct later
    }

    return NextResponse.json({ savedCart });
  } catch (e) {
    console.error('GET /api/cart failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;

    // Ensure JSON body is present
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { items, discountCode, discountCents } = body || {} as {
      items: Array<{
        slug: string;
        title: string;
        price: number;
        quantity: number;
        variations?: Record<string, string>;
        image?: string;
        imageSizes?: any;
        stockQuantity?: number;
      }>;
      discountCode?: string | null;
      discountCents?: number;
    };

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
    }

    await connectToDatabase();

    const update = {
      savedCart: {
        items,
        discountCode: typeof discountCode === 'string' || discountCode === null ? discountCode : null,
        discountCents: typeof discountCents === 'number' ? Math.max(0, Math.floor(discountCents)) : 0,
        updatedAt: new Date(),
      }
    } as any;

    await User.findByIdAndUpdate(user._id, { $set: update }, { new: false });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/cart failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


