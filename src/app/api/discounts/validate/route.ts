import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscountCode from '@/lib/models/DiscountCode';
import Order from '@/lib/models/Order';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;
    await connectToDatabase();

    const body = await request.json();
    const { code, items } = body || {} as { code: string; items: Array<{ price: number; quantity: number }>; };
    if (!code || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'code und items sind erforderlich' }, { status: 400 });
    }

    const normalized = String(code).trim().toUpperCase();
    const now = new Date();
    const doc = await DiscountCode.findOne({ code: normalized }).lean();
    if (!doc) return NextResponse.json({ valid: false, reason: 'Ungültiger Code' }, { status: 404 });

    if (!doc.active) return NextResponse.json({ valid: false, reason: 'Deaktiviert' }, { status: 400 });
    if (doc.startsAt && now < new Date(doc.startsAt)) return NextResponse.json({ valid: false, reason: 'Noch nicht gültig' }, { status: 400 });
    if (doc.endsAt && now > new Date(doc.endsAt)) return NextResponse.json({ valid: false, reason: 'Abgelaufen' }, { status: 400 });
    if (typeof doc.maxGlobalUses === 'number' && typeof doc.globalUses === 'number' && doc.globalUses >= doc.maxGlobalUses) {
      return NextResponse.json({ valid: false, reason: 'Maximale Nutzungen erreicht' }, { status: 400 });
    }

    // Enforce one-time per user if enabled
    if (doc.oneTimeUse) {
      // Enforce per discount document instance, not just by code string
      const alreadyUsed = await Order.findOne({ userId: user._id.toString(), discountId: (doc as any)._id?.toString() }).lean();
      if (alreadyUsed) {
        return NextResponse.json({ valid: false, reason: 'Code bereits verwendet' }, { status: 400 });
      }
    }

    // Sum cart in cents
    const subtotalCents = items.reduce((sum: number, it: any) => sum + (Number(it.price) * Number(it.quantity)), 0);

    let discountCents = 0;
    if (doc.type === 'percent') {
      discountCents = Math.floor((subtotalCents * Number(doc.value)) / 100);
    } else {
      discountCents = Math.floor(Number(doc.value));
    }
    // Ensure at least 1 cent to pay after discount
    discountCents = Math.min(discountCents, Math.max(0, subtotalCents - 1));

    return NextResponse.json({
      valid: true,
      discountId: (doc as any)._id?.toString(),
      code: doc.code,
      type: doc.type,
      value: doc.value,
      discountCents,
    });
  } catch (e) {
    console.error('discounts/validate error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


