import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function GET() {
  try {
    const session = await auth0.getSession();
    
    return NextResponse.json({
      hasSession: !!session,
      user: session?.user || null,
      email_verified: session?.user?.email_verified,
      needsVerification: session?.user && !session.user.email_verified
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
