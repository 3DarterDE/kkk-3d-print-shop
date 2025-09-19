import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Get the current session to get user info
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // For now, we'll just simulate verification
    // In a real implementation, you'd verify the code with Auth0
    // This is a simplified version for demonstration
    
    if (code.length === 6 && /^\d+$/.test(code)) {
      // Update user as verified in database
      await connectToDatabase();
      await User.updateOne(
        { auth0Id: session.user.sub },
        { $set: { isVerified: true } }
      );
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        error: 'Invalid verification code' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
