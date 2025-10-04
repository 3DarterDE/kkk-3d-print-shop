import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import User from '@/lib/models/User';
import { auth0 } from '@/lib/auth0';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import DeletedIdentity from '@/lib/models/DeletedIdentity';

// Note: This endpoint is now read-only with respect to the database.
// It must NOT create or modify users during passive session checks.

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accountDeletedFor = cookieStore.get('accountDeletedFor')?.value;
  const session = await auth0.getSession();
  // Allow explicit interactive login to always proceed (popup completion)
  const allowInteractive = request.nextUrl.searchParams.get('login') === '1';

  // If the last-deleted Auth0 sub matches current session, treat as logged out
  const deletedMatchesCurrent = Boolean(accountDeletedFor && session?.user?.sub && accountDeletedFor === session.user.sub);

  // If no session and deletion flag present, report unauthenticated WITHOUT clearing cookies
  // This avoids racing against a brand-new session right after signup/callback
  if (!allowInteractive && accountDeletedFor && !session?.user) {
    return NextResponse.json({ authenticated: false, isAdmin: false, user: null }, { status: 200 });
  }

  if (!session?.user) {
    // Return 200 with authenticated=false to avoid noisy client errors when logged out
    return NextResponse.json({ authenticated: false, isAdmin: false, user: null }, { status: 200 });
  }

  // If the cookie indicates this exact sub was deleted recently, refuse to upsert and respond unauthenticated
  if (!allowInteractive && deletedMatchesCurrent) {
    return NextResponse.json({ authenticated: false, isAdmin: false, user: null }, { status: 200 });
  }

  // Before upsert: check suppression list to avoid immediate recreation
  try {
    await connectToDatabase();
    const suppressed = !allowInteractive && await DeletedIdentity.findOne({
      auth0Id: session.user.sub,
      expiresAt: { $gt: new Date() }
    }).lean();
    if (suppressed) {
      const res = NextResponse.json({ authenticated: false, isAdmin: false, user: null }, { status: 200 });
      return res;
    }
  } catch (e) {
    // If suppression check fails, proceed (don't block login due to transient DB issue)
  }

  // Read existing user from database (do not create during passive checks)
  try { await connectToDatabase(); } catch {}
  const dbUser = await User.findOne({ auth0Id: session.user.sub }).lean();
  const isAdmin = dbUser?.isAdmin === true;
  // Consider user verified if either DB flag is true OR Auth0 says email_verified=true
  const emailVerifiedFromAuth0 = Boolean((session.user as any).email_verified);
  const isVerified = (dbUser?.isVerified === true) || emailVerifiedFromAuth0 === true;


  const res = NextResponse.json({ 
    authenticated: true, 
    isAdmin, 
    needsVerification: !isVerified,
    user: {
      sub: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      email_verified: isVerified,
      // Include all profile data from database
      firstName: dbUser?.firstName,
      lastName: dbUser?.lastName,
      salutation: dbUser?.salutation,
      phone: dbUser?.phone,
      address: dbUser?.address,
      billingAddress: dbUser?.billingAddress,
      paymentMethod: dbUser?.paymentMethod,
      bonusPoints: dbUser?.bonusPoints || 0,
      newsletterSubscribed: dbUser?.newsletterSubscribed || false,
    }
  });

  // If a new session exists and the cookie targeted a different (previous) sub, clear it
  if (accountDeletedFor && session?.user?.sub && accountDeletedFor !== session.user.sub) {
    res.cookies.delete('accountDeletedFor');
  }

  return res;
}
