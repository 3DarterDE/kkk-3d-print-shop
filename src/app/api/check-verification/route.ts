import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { auth0Id } = await request.json();
    
    if (!auth0Id) {
      return NextResponse.json({ error: 'Auth0Id is required' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ auth0Id }).lean();
    
    return NextResponse.json({ 
      isVerified: user?.isVerified || false,
      email: user?.email,
      name: user?.name
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
