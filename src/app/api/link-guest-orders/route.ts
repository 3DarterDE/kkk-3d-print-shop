import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { linkGuestOrdersToUser, getGuestOrdersByEmail } from '@/lib/link-guest-orders';

export const runtime = 'nodejs';

/**
 * GET: Get guest orders for the current user's email
 * POST: Manually link guest orders to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;

    if (!user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const guestOrders = await getGuestOrdersByEmail(user.email);
    
    return NextResponse.json({ 
      guestOrders,
      count: guestOrders.length 
    });
  } catch (error) {
    console.error('Error fetching guest orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) return response!;

    if (!user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const linkedCount = await linkGuestOrdersToUser(user._id.toString(), user.email);
    
    return NextResponse.json({ 
      success: true,
      linkedCount,
      message: `Successfully linked ${linkedCount} guest orders to your account`
    });
  } catch (error) {
    console.error('Error linking guest orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
