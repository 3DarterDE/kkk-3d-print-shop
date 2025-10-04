import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { auth0Id } = await request.json();
    if (!auth0Id || typeof auth0Id !== 'string') {
      return NextResponse.json({ error: 'auth0Id required' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ auth0Id }).lean();
    return NextResponse.json({ isVerified: Boolean(user?.isVerified) });
  } catch (error) {
    return NextResponse.json({ isVerified: false }, { status: 200 });
  }
}
