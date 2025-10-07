import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscountCode from '@/lib/models/DiscountCode';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();

    const list = await DiscountCode.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ discounts: list });
  } catch (e) {
    console.error('admin/discounts GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();

    const body = await request.json();
    const { code, type, value, startsAt, endsAt, active, oneTimeUse, maxGlobalUses } = body || {};

    const toDate = (v: any) => {
      if (!v) return undefined;
      try {
        if (typeof v === 'string') {
          const s = v.trim();
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
            // datetime-local without seconds → assume UTC seconds
            const d = new Date(s + ':00Z');
            return isNaN(d.getTime()) ? undefined : d;
          }
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const d = new Date(s + 'T00:00:00Z');
            return isNaN(d.getTime()) ? undefined : d;
          }
        }
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      } catch {
        return undefined;
      }
    };

    if (!code || !type || typeof value !== 'number') {
      return NextResponse.json({ error: 'code, type and value are required' }, { status: 400 });
    }

    const doc = await DiscountCode.create({
      code: String(code).trim().toUpperCase(),
      type,
      value,
      startsAt: toDate(startsAt),
      endsAt: toDate(endsAt),
      active: active !== false,
      oneTimeUse: Boolean(oneTimeUse),
      maxGlobalUses: typeof maxGlobalUses === 'number' ? maxGlobalUses : undefined,
      createdBy: user._id.toString(),
    });

    return NextResponse.json({ discount: doc });
  } catch (e: any) {
    console.error('admin/discounts POST error:', e);
    if (e?.code === 11000) {
      return NextResponse.json({ error: 'Code bereits vorhanden' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();

    const body = await request.json();
    const { id, ...updates } = body || {};
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const toDate = (v: any) => {
      if (!v) return undefined;
      try {
        if (typeof v === 'string') {
          const s = v.trim();
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
            const d = new Date(s + ':00Z');
            return isNaN(d.getTime()) ? undefined : d;
          }
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const d = new Date(s + 'T00:00:00Z');
            return isNaN(d.getTime()) ? undefined : d;
          }
        }
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      } catch {
        return undefined;
      }
    };

    if (updates.code) updates.code = String(updates.code).trim().toUpperCase();
    if (updates.startsAt) updates.startsAt = toDate(updates.startsAt);
    if (updates.endsAt) updates.endsAt = toDate(updates.endsAt);

    const doc = await DiscountCode.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!doc) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    return NextResponse.json({ discount: doc });
  } catch (e) {
    console.error('admin/discounts PATCH error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const res = await DiscountCode.findByIdAndDelete(id);
    if (!res) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('admin/discounts DELETE error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


